import semverSatisfies from 'semver/functions/satisfies'
import Web3 from 'web3'
import { provider as Provider } from 'web3-core'
import { ContentHash } from 'web3-eth-ens'
import Safe, { Web3Adapter } from '@gnosis.pm/safe-core-sdk'
import { PolyjuiceHttpProvider, PolyjuiceAccounts } from '@polyjuice-provider/web3/packages/web3'

import {
  getSafeSingletonDeployment,
  getSafeL2SingletonDeployment,
  getProxyFactoryDeployment,
  getFallbackHandlerDeployment,
  getMultiSendCallOnlyDeployment,
  getSignMessageLibDeployment,
} from '@gnosis.pm/safe-deployments'

import { sameAddress, ZERO_ADDRESS } from './ethAddresses'
import { EMPTY_DATA } from './ethTransactions'
import { ProviderProps } from './store/model/provider'
import { getRpcServiceUrl, _getChainId } from 'src/config'
import { CHAIN_ID, ChainId } from 'src/config/chain.d'
import { isValidCryptoDomainName } from 'src/logic/wallets/ethAddresses'
import { getAddressFromUnstoppableDomain } from './utils/unstoppableDomains'
import { PolyjuiceConfig } from '@polyjuice-provider/web3/packages/base'

// This providers have direct relation with name assigned in bnc-onboard configuration
export enum WALLET_PROVIDER {
  METAMASK = 'METAMASK',
  TORUS = 'TORUS',
  PORTIS = 'PORTIS',
  FORTMATIC = 'FORTMATIC',
  SQUARELINK = 'SQUARELINK',
  WALLETCONNECT = 'WALLETCONNECT',
  TRUST = 'TRUST',
  OPERA = 'OPERA',
  // This is the provider for WALLET_LINK configuration on bnc-onboard
  COINBASE_WALLET = 'COINBASE WALLET',
  AUTHEREUM = 'AUTHEREUM',
  LEDGER = 'LEDGER',
  TREZOR = 'TREZOR',
  LATTICE = 'LATTICE',
  KEYSTONE = 'KEYSTONE',
}

// With some wallets from web3connect you have to use their provider instance only for signing
// And our own one to fetch data
const httpProviderOptions = {
  timeout: 10_000,
}

const web3ReadOnly: Web3[] = []
export const getWeb3ReadOnly = (): Web3 => {
  console.log('getWeb3ReadOnly')
  const chainId = _getChainId()
  if (!web3ReadOnly[chainId]) {
    web3ReadOnly[chainId] = new Web3(
      process.env.NODE_ENV !== 'test'
        ? new Web3.providers.HttpProvider(getRpcServiceUrl(), httpProviderOptions)
        : 'ws://localhost:8545',
    )
  }

  return web3ReadOnly[chainId]
}

let web3: Web3
let web3Ethereum: Web3
let polyjuiceProvider: PolyjuiceHttpProvider

const TESTNET_POLYJUICE_CONFIG: PolyjuiceConfig = {
  web3Url: 'https://godwoken-testnet-web3-rpc.ckbapp.dev',
  ethAccountLockCodeHash: '0xdeec13a7b8e100579541384ccaf4b5223733e4a5483c3aec95ddc4c1d5ea5b22',
}

const MAINNET_POLYJUICE_CONFIG: PolyjuiceConfig = {
  web3Url: 'https://mainnet.godwoken.io/rpc',
  ethAccountLockCodeHash: '0x1563080d175bf8ddd44a48e850cecf0c0b4575835756eb5ffd53ad830931b9f9',
}

export function getPolyjuiceConfig(chainId = Number(_getChainId())) {
  console.log('getpolyjuiceconfig', {
    chainId
  });
  if (chainId === 71394) {
    return MAINNET_POLYJUICE_CONFIG;
  }

  return TESTNET_POLYJUICE_CONFIG;
}
export const getWeb3 = (): Web3 => web3
export const getWeb3Ethereum = (): Web3 => web3Ethereum
export const getPolyjuiceProvider = (): PolyjuiceHttpProvider => polyjuiceProvider
export const setPolyjuiceProvider = async (): Promise<void> => {
  if (polyjuiceProvider) {
    return
  }

  const polyjuiceConfig = getPolyjuiceConfig();
  polyjuiceProvider = new PolyjuiceHttpProvider(polyjuiceConfig.web3Url as string, polyjuiceConfig)

  polyjuiceProvider.setMultiAbi([
    (getSafeSingletonDeployment() as any).abi.filter((i) => !['getOwners', 'getTransactionHash'].includes(i.name)),
    (getSafeL2SingletonDeployment() as any).abi.filter((i) => !['getOwners', 'getTransactionHash'].includes(i.name)),
    (getProxyFactoryDeployment() as any).abi,
    (getFallbackHandlerDeployment() as any).abi,
    (getMultiSendCallOnlyDeployment() as any).abi,
    (getSignMessageLibDeployment() as any).abi,
  ])

  await polyjuiceProvider.godwoker.init()
}
export const setWeb3Ethereum = (provider: Provider): void => {
  web3Ethereum = new Web3(provider)
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setWeb3 = async (provider?: Provider): Promise<void> => {
  console.log('setWeb3', {
    provider
  })

  if (provider) {
    setWeb3Ethereum(provider);
  }

  await setPolyjuiceProvider()
  const godwokenProvider = getPolyjuiceProvider()

  console.log({ godwokenProvider })

  const polyjuiceConfig = getPolyjuiceConfig();

  web3 = new Web3(godwokenProvider)
  const polyjuiceAccounts = new PolyjuiceAccounts(polyjuiceConfig)
  await polyjuiceAccounts.godwoker.init()
  ;(web3 as any).eth.accounts = new PolyjuiceAccounts(polyjuiceConfig)
  ;(web3 as any).eth.Contract.setProvider(godwokenProvider, web3.eth.accounts)
}
export const setWeb3ReadOnly = (): void => {
  web3 = getWeb3ReadOnly()
}
export const resetWeb3 = (): void => {
  console.log('resetWeb3')
  web3 = web3ReadOnly[_getChainId()]
}

export const getAccountFrom = async (web3Provider: Web3): Promise<string | null> => {
  const accounts = await web3Provider.eth.getAccounts()
  return accounts && accounts.length > 0 ? accounts[0] : null
}

export const getChainIdFrom = (web3Provider: Web3): Promise<number> => {
  return web3Provider.eth.getChainId()
}

const isHardwareWallet = (walletName: string) =>
  sameAddress(WALLET_PROVIDER.LEDGER, walletName) || sameAddress(WALLET_PROVIDER.TREZOR, walletName)

export const isSmartContractWallet = async (web3Provider: Web3, account: string): Promise<boolean> => {
  if (!account) {
    return false
  }
  let contractCode = ''
  try {
    contractCode = await web3Provider.eth.getCode(account)
  } catch (e) {
    // ignore
  }
  return !!contractCode && contractCode.replace(EMPTY_DATA, '').replace(/0/g, '') !== ''
}

export const getProviderInfo = async (web3Instance: Web3, providerName = 'Wallet'): Promise<ProviderProps> => {
  const account = (await getAccountFrom(web3Instance)) || ''
  console.log('getProviderInfo', {
    account,
  })

  await new Promise((r) => setTimeout(r, 2000))
  const polyjuiceAccount =
    (await getPolyjuiceProvider().godwoker.getShortAddressByAllTypeEthAddress(account)).value || ''
  const network = await getChainIdFrom(web3Instance)
  const smartContractWallet = await isSmartContractWallet(web3Instance, account)
  const hardwareWallet = isHardwareWallet(providerName)
  const available = Boolean(account)

  return {
    name: providerName,
    available,
    loaded: true,
    account,
    polyjuiceAccount,
    network: network.toString() as ChainId,
    smartContractWallet,
    hardwareWallet,
  }
}

export const getAddressFromDomain = (name: string): Promise<string> => {
  if (isValidCryptoDomainName(name)) {
    return getAddressFromUnstoppableDomain(name)
  }
  return getWeb3ReadOnly().eth.ens.getAddress(name)
}

export const getContentFromENS = (name: string): Promise<ContentHash> => web3.eth.ens.getContenthash(name)

export const isTxPendingError = (err: Error): boolean => {
  const WEB3_TX_NOT_MINED_ERROR = 'Transaction was not mined within'
  return (err.message || '').startsWith(WEB3_TX_NOT_MINED_ERROR)
}

export const getSDKWeb3Adapter = (signerAddress: string): Web3Adapter => {
  return new Web3Adapter({
    web3: getWeb3(),
    signerAddress,
  })
}

export const getSDKWeb3ReadOnly = (): Web3Adapter => {
  return new Web3Adapter({
    web3: getWeb3ReadOnly(),
    signerAddress: ZERO_ADDRESS,
  })
}

export const getSafeSDK = async (signerAddress: string, safeAddress: string, safeVersion: string): Promise<Safe> => {
  const networkId = (await getChainIdFrom(web3)).toString() as ChainId
  const ethAdapter = getSDKWeb3Adapter(signerAddress)

  let isL1SafeMasterCopy: boolean
  if (semverSatisfies(safeVersion, '<1.3.0')) {
    isL1SafeMasterCopy = true
  } else {
    isL1SafeMasterCopy = networkId === CHAIN_ID.ETHEREUM
  }

  return await Safe.create({
    ethAdapter,
    safeAddress,
    isL1SafeMasterCopy,
  })
}
