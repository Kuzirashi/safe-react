import { List } from 'immutable'
import { Confirmation } from 'src/logic/safe/store/models/types/confirmation'
import { EMPTY_DATA } from 'src/logic/wallets/ethTransactions'
import semverSatisfies from 'semver/functions/satisfies'
import { SAFE_VERSION_FOR_OFF_CHAIN_SIGNATURES } from './transactions/offchainSigner'
import { getPolyjuiceProvider } from '../wallets/getWeb3'

// Here we're checking that safe contract version is greater or equal 1.1.1, but
// theoretically EIP712 should also work for 1.0.0 contracts
// Also, offchain signatures are not working for ledger/trezor wallet because of a bug in their library:
// https://github.com/LedgerHQ/ledgerjs/issues/378
// Couldn't find an issue for trezor but the error is almost the same
export const checkIfOffChainSignatureIsPossible = (
  isExecution: boolean,
  isSmartContractWallet: boolean,
  safeVersion?: string,
): boolean =>
  !isExecution &&
  !isSmartContractWallet &&
  !!safeVersion &&
  semverSatisfies(safeVersion, SAFE_VERSION_FOR_OFF_CHAIN_SIGNATURES)

// https://docs.gnosis.io/safe/docs/contracts_signatures/#pre-validated-signatures
export const getPreValidatedSignatures = async (
  fromEthereumAdress: string,
  initialString: string = EMPTY_DATA,
): Promise<string> => {
  const web3Provider = getPolyjuiceProvider()

  const shortAddress = await web3Provider.godwoker.getShortAddressByAllTypeEthAddress(fromEthereumAdress)

  if (!shortAddress) {
    throw new Error(`Can't convert Ethereum address: ${fromEthereumAdress} to Godwoken address.`)
  }

  return `${initialString}000000000000000000000000${shortAddress.value.replace(
    EMPTY_DATA,
    '',
  )}000000000000000000000000000000000000000000000000000000000000000001`
}

export const generateSignaturesFromTxConfirmations = async (
  confirmations?: List<Confirmation>,
  preApprovingOwner?: string,
): Promise<string> => {
  let confirmationsMap =
    confirmations?.map((value) => {
      return {
        signature: value.signature,
        owner: value.owner.toLowerCase(),
      }
    }) || List([])

  if (preApprovingOwner) {
    confirmationsMap = confirmationsMap.push({ owner: preApprovingOwner, signature: null })
  }

  // The constant parts need to be sorted so that the recovered signers are sorted ascending
  // (natural order) by address (not checksummed).
  confirmationsMap = confirmationsMap.sort((ownerA, ownerB) => ownerA.owner.localeCompare(ownerB.owner))

  let sigs = '0x'
  for (const { signature, owner } of confirmationsMap) {
    if (signature) {
      sigs += signature.slice(2)
    } else {
      // https://docs.gnosis.io/safe/docs/contracts_signatures/#pre-validated-signatures
      sigs += await getPreValidatedSignatures(owner, '')
    }
  }

  return sigs
}
