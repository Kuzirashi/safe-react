import semverSatisfies from 'semver/functions/satisfies'
import {
  getSafeSingletonDeployment,
  getSafeL2SingletonDeployment,
  getProxyFactoryDeployment,
  getFallbackHandlerDeployment,
  getMultiSendCallOnlyDeployment,
  getSignMessageLibDeployment,
} from '@gnosis.pm/safe-deployments'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'

import { LATEST_SAFE_VERSION } from 'src/utils/constants'
import { getChainById, _getChainId } from 'src/config'
import { ChainId } from 'src/config/chain.d'
import { ZERO_ADDRESS } from 'src/logic/wallets/ethAddresses'
import { calculateGasOf, EMPTY_DATA } from 'src/logic/wallets/ethTransactions'
import { getWeb3, getChainIdFrom, setWeb3 } from 'src/logic/wallets/getWeb3'
import { GnosisSafe } from 'src/types/contracts/gnosis_safe.d'
import { ProxyFactory } from 'src/types/contracts/proxy_factory.d'
import { CompatibilityFallbackHandler } from 'src/types/contracts/compatibility_fallback_handler.d'
import { SignMessageLib } from 'src/types/contracts/sign_message_lib.d'
import { MultiSend } from 'src/types/contracts/multi_send.d'
import { getSafeInfo } from 'src/logic/safe/utils/safeInformation'
import PolyjuiceHttpProvider from '@polyjuice-provider/web3/packages/web3'

export const SENTINEL_ADDRESS = '0x0000000000000000000000000000000000000001'

let proxyFactoryMaster: ProxyFactory
let safeMaster: GnosisSafe
let fallbackHandler: CompatibilityFallbackHandler
let multiSend: MultiSend

const getSafeContractDeployment = ({ safeVersion }: { safeVersion: string }) => {
  // We check if version is prior to v1.0.0 as they are not supported but still we want to keep a minimum compatibility
  const useOldestContractVersion = semverSatisfies(safeVersion, '<1.0.0')
  // We have to check if network is L2
  const networkId = _getChainId()
  const chainConfig = getChainById(networkId)
  // We had L1 contracts in three L2 networks, xDai, EWC and Volta so even if network is L2 we have to check that safe version is after v1.3.0
  const useL2ContractVersion = chainConfig.l2 && semverSatisfies(safeVersion, '>=1.3.0')
  const getDeployment = useL2ContractVersion ? getSafeL2SingletonDeployment : getSafeSingletonDeployment

  return (
    getDeployment({
      version: safeVersion,
      network: networkId.toString(),
    }) ||
    getDeployment({
      version: safeVersion,
    }) ||
    // In case we couldn't find a valid deployment and it's a version before 1.0.0 we return v1.0.0 to allow a minimum compatibility
    (useOldestContractVersion
      ? getDeployment({
          version: '1.0.0',
        })
      : undefined)
  )
}

/**
 * Creates a Contract instance of the GnosisSafe contract
 * @param {Web3} web3
 * @param {ChainId} chainId
 */
const getGnosisSafeContractInstance = (web3: Web3, chainId: ChainId): GnosisSafe => {
  const safeSingletonDeployment = getSafeContractDeployment({ safeVersion: LATEST_SAFE_VERSION })
  const contractAddress = safeSingletonDeployment?.networkAddresses[chainId]

  if (!contractAddress) {
    throw new Error(`GnosisSafe contract not found for chainId: ${chainId}`)
  }

  return new web3.eth.Contract(safeSingletonDeployment?.abi as AbiItem[], contractAddress) as unknown as GnosisSafe
}

/**
 * Creates a Contract instance of the GnosisSafeProxyFactory contract
 * @param {Web3} web3
 * @param {ChainId} chainId
 */
const getProxyFactoryContractInstance = (web3: Web3, chainId: ChainId): ProxyFactory => {
  const proxyFactoryDeployment =
    getProxyFactoryDeployment({
      version: LATEST_SAFE_VERSION,
      network: chainId.toString(),
    }) ||
    getProxyFactoryDeployment({
      version: LATEST_SAFE_VERSION,
    })
  const contractAddress = proxyFactoryDeployment?.networkAddresses[chainId]

  if (!contractAddress) {
    throw new Error(`GnosisSafeProxyFactory contract not found for chainId: ${chainId}`)
  }

  return new web3.eth.Contract(proxyFactoryDeployment?.abi as AbiItem[], contractAddress) as unknown as ProxyFactory
}

/**
 * Creates a Contract instance of the FallbackHandler contract
 * @param {Web3} web3
 * @param {ChainId} chainId
 */
const getFallbackHandlerContractInstance = (web3: Web3, chainId: ChainId): CompatibilityFallbackHandler => {
  const fallbackHandlerDeployment =
    getFallbackHandlerDeployment({
      version: LATEST_SAFE_VERSION,
      network: chainId.toString(),
    }) ||
    getFallbackHandlerDeployment({
      version: LATEST_SAFE_VERSION,
    })
  const contractAddress = fallbackHandlerDeployment?.networkAddresses[chainId]

  if (!contractAddress) {
    throw new Error(`FallbackHandler contract not found for chainId: ${chainId}`)
  }

  return new web3.eth.Contract(
    fallbackHandlerDeployment?.abi as AbiItem[],
    contractAddress,
  ) as unknown as CompatibilityFallbackHandler
}

/**
 * Creates a Contract instance of the MultiSend contract
 * @param {Web3} web3
 * @param {ChainId} chainId
 */
const getMultiSendContractInstance = (web3: Web3, chainId: ChainId): MultiSend => {
  const multiSendDeployment =
    getMultiSendCallOnlyDeployment({
      network: chainId.toString(),
    }) || getMultiSendCallOnlyDeployment()
  const contractAddress = multiSendDeployment?.networkAddresses[chainId]

  if (!contractAddress) {
    throw new Error(`MultiSend contract not found for chainId: ${chainId}`)
  }

  return new web3.eth.Contract(multiSendDeployment?.abi as AbiItem[], contractAddress) as unknown as MultiSend
}

/**
 * Returns an address of SignMessageLib for passed chainId
 * @param {ChainId} chainId
 * @returns {string}
 */
export const getSignMessageLibAddress = (chainId: ChainId): string | undefined => {
  const signMessageLibDeployment =
    getSignMessageLibDeployment({
      network: chainId.toString(),
    }) || getSignMessageLibDeployment()
  const contractAddress = signMessageLibDeployment?.networkAddresses[chainId]

  if (!contractAddress) {
    throw new Error(`SignMessageLib contract not found for chainId: ${chainId}`)
  }

  return contractAddress
}

/**
 * Returns a Web3 Contract instance of the SignMessageLib contract
 * @param {Web3} web3
 * @param {ChainId} chainId
 * @returns {SignMessageLib}
 */
export const getSignMessageLibContractInstance = (web3: Web3, chainId: ChainId): SignMessageLib => {
  const signMessageLibDeployment =
    getSignMessageLibDeployment({
      network: chainId.toString(),
    }) || getSignMessageLibDeployment()
  const contractAddress = signMessageLibDeployment?.networkAddresses[chainId]

  if (!contractAddress) {
    throw new Error(`SignMessageLib contract not found for chainId: ${chainId}`)
  }

  return new web3.eth.Contract(signMessageLibDeployment?.abi as AbiItem[], contractAddress) as unknown as SignMessageLib
}

export const getMasterCopyAddressFromProxyAddress = async (proxyAddress: string): Promise<string | undefined> => {
  let masterCopyAddress: string | undefined
  try {
    const res = await getSafeInfo(proxyAddress)
    masterCopyAddress = res.implementation.value
    if (!masterCopyAddress) {
      console.error(`There was not possible to get masterCopy address from proxy ${proxyAddress}.`)
    }
  } catch (e) {
    e.log()
  }
  return masterCopyAddress
}

export const instantiateSafeContracts = async () => {
  const web3 = getWeb3()
  const chainId = (await getChainIdFrom(web3)).toString() as ChainId

  // Create ProxyFactory Master Copy
  proxyFactoryMaster = getProxyFactoryContractInstance(web3, chainId)

  // Create Safe Master copy
  safeMaster = getGnosisSafeContractInstance(web3, chainId)

  // Create Fallback Handler
  fallbackHandler = getFallbackHandlerContractInstance(web3, chainId)

  // Create MultiSend contract
  multiSend = getMultiSendContractInstance(web3, chainId)
}

export const getSafeMasterContract = async () => {
  await instantiateSafeContracts()
  return safeMaster
}

export const getSafeMasterContractAddress = () => {
  return safeMaster.options.address
}

export const getFallbackHandlerContractAddress = () => {
  return fallbackHandler.options.address
}

export const getMultisendContract = () => {
  return multiSend
}

export const getMultisendContractAddress = () => {
  return multiSend.options.address
}

export const getSafeDeploymentTransaction = async (
  safeAccounts: string[],
  numConfirmations: number,
  safeCreationSalt: number,
) => {
  const safeAccountsGodwokenAddresses: string[] = [];
  const web3Provider = getWeb3().currentProvider as any as PolyjuiceHttpProvider;

  console.log('getSafeDeploymentTransaction', {
    web3Provider
  });

  for (const account of safeAccounts) {
    const shortAddress = await web3Provider.godwoker.getShortAddressByAllTypeEthAddress(account);

    if (!shortAddress) {
      throw new Error(`Can't convert Ethereum address: ${account} to Godwoken address.`);
    }

    safeAccountsGodwokenAddresses.push(
      shortAddress.value
    );
  }

  const gnosisSafeData = safeMaster.methods
    .setup(
      safeAccountsGodwokenAddresses,
      numConfirmations,
      ZERO_ADDRESS,
      EMPTY_DATA,
      fallbackHandler.options.address,
      ZERO_ADDRESS,
      0,
      ZERO_ADDRESS,
    )
    .encodeABI()

  console.log('getSafeDeploymentTransaction', {
    'safeMaster.options.address': safeMaster.options.address,
    gnosisSafeData,
    safeCreationSalt,
    safeAccounts,
    safeAccountsGodwokenAddresses
  });

  // return {} as any;
  return proxyFactoryMaster.methods.createProxyWithNonce(safeMaster.options.address, gnosisSafeData, safeCreationSalt)
}

export const estimateGasForDeployingSafe = async (
  safeAccounts: string[],
  numConfirmations: number,
  userAccount: string,
  safeCreationSalt: number,
) => {
  const proxyFactoryData = (await getSafeDeploymentTransaction(safeAccounts, numConfirmations, safeCreationSalt)).encodeABI()

  return calculateGasOf({
    data: proxyFactoryData,
    from: userAccount,
    to: proxyFactoryMaster.options.address,
  }).then((value) => value * 2)
}

export const getGnosisSafeInstanceAt = (safeAddress: string, safeVersion: string): GnosisSafe => {
  const safeSingletonDeployment = getSafeContractDeployment({ safeVersion })

  const web3 = getWeb3()
  // console.log('getGnosisSafeInstanceAt', {
  //   web3
  // });
  // console.log('X!!!!!!!!!!!!!!!', {
  //   safeAddress
  // });
  const contract = new web3.eth.Contract(safeSingletonDeployment?.abi as AbiItem[], safeAddress) as unknown as GnosisSafe;
  // ;(web3 as any).eth.accounts = new PolyjuiceAccounts(polyjuiceConfig)
  // (contract as any).setProvider(web3, web3.eth.accounts)
  return contract;
}
