import { ReactElement, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader } from '@gnosis.pm/safe-react-components'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { TransactionDetails } from '@gnosis.pm/safe-react-gateway-sdk'

import { isTxQueued, TxLocation } from 'src/logic/safe/store/models/types/gateway.d'
import {
  extractPrefixedSafeAddress,
  extractSafeAddress,
  generateSafeRoute,
  SafeRouteSlugs,
  SAFE_ROUTES,
  TRANSACTION_ID_SLUG,
  history,
} from 'src/routes/routes'
import { Centered } from './styled'
import { getTransactionWithLocationByAttribute } from 'src/logic/safe/store/selectors/gatewayTransactions'
import { TxLocationContext } from './TxLocationProvider'
import { AppReduxState } from 'src/store'
import { logError, Errors } from 'src/logic/exceptions/CodedException'
import { fetchSafeTransaction } from 'src/logic/safe/transactions/api/fetchSafeTransaction'
import { makeTxFromDetails } from './utils'
import {
  addQueuedTransactions,
  addHistoryTransactions,
} from 'src/logic/safe/store/actions/transactions/gatewayTransactions'
import { HistoryPayload, QueuedPayload } from 'src/logic/safe/store/reducer/gatewayTransactions'
import { Transaction } from 'src/logic/safe/store/models/types/gateway.d'
import { currentChainId } from 'src/logic/config/store/selectors'
import { QueueTxList } from './QueueTxList'
import { HistoryTxList } from './HistoryTxList'

const TxSingularDetails = (): ReactElement => {
  const { [TRANSACTION_ID_SLUG]: safeTxHash = '' } = useParams<SafeRouteSlugs>()
  const [fetchedTx, setFetchedTx] = useState<TransactionDetails>()
  const [liveTx, setLiveTx] = useState<{ txLocation: TxLocation; transaction: Transaction }>()
  const dispatch = useDispatch()
  const chainId = useSelector(currentChainId)

  // We must use the tx from the store as the queue actions alter the tx
  const indexedTx = useSelector(
    (state: AppReduxState) =>
      fetchedTx
        ? getTransactionWithLocationByAttribute(state, { attributeName: 'id', attributeValue: fetchedTx.txId })
        : null,
    shallowEqual,
  )

  // The indexedTx can be temporailiy not found when re-fetching the queue
  // To avoid showing a loader, we use a locally cached version of it
  useEffect(() => {
    if (indexedTx != null) {
      setLiveTx(indexedTx)
    }
  }, [indexedTx])

  // When safeTxHash changes, we fetch tx details for this hash
  useEffect(() => {
    let isCurrent = true

    setFetchedTx(undefined)

    if (!safeTxHash) {
      const txsRoute = generateSafeRoute(SAFE_ROUTES.TRANSACTIONS, extractPrefixedSafeAddress())
      history.replace(txsRoute)
      return
    }

    const getTransaction = async (): Promise<void> => {
      // Remove the previously loaded tx (when making a new tx from the single tx route)
      setLiveTx(undefined)

      let txDetails: TransactionDetails
      try {
        txDetails = await fetchSafeTransaction(safeTxHash)
      } catch (e) {
        logError(Errors._614, e.message)
        return
      }

      if (isCurrent) {
        setFetchedTx(txDetails)
      }
    }

    getTransaction()

    return () => {
      isCurrent = false
    }
  }, [safeTxHash, setFetchedTx, setLiveTx])

  // Add the tx to the store
  useEffect(() => {
    if (!fetchedTx) return
    ;(async () => {
      // Format the tx details into a History or Queue-like tx item
      const listItemTx = await makeTxFromDetails(fetchedTx)
      const payload: HistoryPayload | QueuedPayload = {
        chainId,
        safeAddress: extractSafeAddress(),
        values: [
          {
            transaction: listItemTx,
            type: 'TRANSACTION', // Other types are discarded in reducer
            conflictType: 'None', // Not used in reducer
          },
        ],
      }
      // And add it to the corresponding list in the store
      dispatch(isTxQueued(listItemTx.txStatus) ? addQueuedTransactions(payload) : addHistoryTransactions(payload))
    })()
  }, [fetchedTx, chainId, dispatch])

  if (!liveTx) {
    return (
      <Centered padding={10}>
        <Loader size="sm" />
      </Centered>
    )
  }

  const { transaction, txLocation } = liveTx
  const TxList = isTxQueued(transaction.txStatus) ? QueueTxList : HistoryTxList

  return (
    <TxLocationContext.Provider value={{ txLocation }}>
      <TxList transactions={[[transaction.timestamp.toString(), [transaction]]]} />
    </TxLocationContext.Provider>
  )
}

export default TxSingularDetails
