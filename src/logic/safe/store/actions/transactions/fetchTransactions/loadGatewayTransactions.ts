import {
  AddressEx,
  getTransactionHistory,
  getTransactionQueue,
  TransactionListItem,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { _getChainId } from 'src/config'
import { HistoryGatewayResponse, QueuedGatewayResponse } from 'src/logic/safe/store/models/types/gateway.d'
import { checksumAddress } from 'src/utils/checksumAddress'
import { Errors, CodedException } from 'src/logic/exceptions/CodedException'
import { GATEWAY_URL } from 'src/utils/constants'
import { getPolyjuiceProvider, setPolyjuiceProvider } from 'src/logic/wallets/getWeb3'

/*************/
/*  HISTORY  */
/*************/
const historyPointers: { [chainId: string]: { [safeAddress: string]: { next?: string; previous?: string } } } = {}

/**
 * Fetch next page if there is a next pointer for the safeAddress.
 * If the fetch was success, updates the pointers.
 * @param {string} safeAddress
 */
export const loadPagedHistoryTransactions = async (
  safeAddress: string,
): Promise<{ values: HistoryGatewayResponse['results']; next?: string } | undefined> => {
  const chainId = _getChainId()
  // if `historyPointers[safeAddress] is `undefined` it means `loadHistoryTransactions` wasn't called
  // if `historyPointers[safeAddress].next is `null`, it means it reached the last page in gateway-client
  if (!historyPointers[chainId][safeAddress]?.next) {
    throw new CodedException(Errors._608)
  }

  try {
    const { results, next, previous } = await getTransactionHistory(
      GATEWAY_URL,
      chainId,
      checksumAddress(safeAddress),
      historyPointers[chainId][safeAddress].next,
    )

    historyPointers[chainId][safeAddress] = { next, previous }

    return { values: results, next: historyPointers[chainId][safeAddress].next }
  } catch (e) {
    throw new CodedException(Errors._602, e.message)
  }
}

export const loadHistoryTransactions = async (safeAddress: string): Promise<HistoryGatewayResponse['results']> => {
  const chainId = _getChainId()
  try {
    const { results, next, previous } = await getTransactionHistory(GATEWAY_URL, chainId, checksumAddress(safeAddress))

    if (!historyPointers[chainId]) {
      historyPointers[chainId] = {}
    }

    if (!historyPointers[chainId][safeAddress]) {
      historyPointers[chainId][safeAddress] = { next, previous }
    }

    return results
  } catch (e) {
    throw new CodedException(Errors._602, e.message)
  }
}

/************/
/*  QUEUED  */
/************/
const queuedPointers: { [chainId: string]: { [safeAddress: string]: { next?: string; previous?: string } } } = {}

/**
 * Fetch next page if there is a next pointer for the safeAddress.
 * If the fetch was success, updates the pointers.
 * @param {string} safeAddress
 */
export const loadPagedQueuedTransactions = async (
  safeAddress: string,
): Promise<{ values: QueuedGatewayResponse['results']; next?: string } | undefined> => {
  const chainId = _getChainId()
  // if `queuedPointers[safeAddress] is `undefined` it means `loadHistoryTransactions` wasn't called
  // if `queuedPointers[safeAddress].next is `null`, it means it reached the last page in gateway-client
  if (!queuedPointers[safeAddress]?.next) {
    throw new CodedException(Errors._608)
  }

  try {
    const { results, next, previous } = await getTransactionQueue(
      GATEWAY_URL,
      chainId,
      checksumAddress(safeAddress),
      queuedPointers[chainId][safeAddress].next,
    )

    queuedPointers[chainId][safeAddress] = { next, previous }

    return { values: results, next: queuedPointers[chainId][safeAddress].next }
  } catch (e) {
    throw new CodedException(Errors._603, e.message)
  }
}

export async function transformQueuedTransaction(transactions: TransactionListItem[]): Promise<TransactionListItem[]> {
  const transformedTransactions: TransactionListItem[] = []

  await setPolyjuiceProvider()
  const web3Provider = getPolyjuiceProvider()

  for (const tx of transactions as any) {
    if (tx?.transaction?.executionInfo?.missingSigners) {
      const ethAddressesSigners: AddressEx[] = []

      for (const account of tx.transaction.executionInfo.missingSigners) {
        try {
          const shortAddress = await web3Provider.godwoker.getEthAddressByAllTypeShortAddress(account.value)

          if (!shortAddress) {
            throw new Error()
          }

          ethAddressesSigners.push({ value: checksumAddress(shortAddress), name: null, logoUri: null })
        } catch (error) {
          console.log(`[fetchSafeTransaction] Can't convert Ethereum address: ${account.value} to Godwoken address.`)
        }
      }

      tx.transaction.executionInfo.missingSigners = ethAddressesSigners
    }

    transformedTransactions.push(tx)
  }

  return transformedTransactions
}

export const loadQueuedTransactions = async (safeAddress: string): Promise<QueuedGatewayResponse['results']> => {
  const chainId = _getChainId()
  try {
    const { results, next, previous } = await getTransactionQueue(GATEWAY_URL, chainId, checksumAddress(safeAddress))

    // console.log('XXXX loadQueuedTransactions', {
    //   results,
    // })

    if (!queuedPointers[chainId]) {
      queuedPointers[chainId] = {}
    }

    if (!queuedPointers[chainId][safeAddress] || queuedPointers[chainId][safeAddress].next === null) {
      queuedPointers[chainId][safeAddress] = { next, previous }
    }
    // return results
    return await transformQueuedTransaction(results)
  } catch (e) {
    throw new CodedException(Errors._603, e.message)
  }
}
