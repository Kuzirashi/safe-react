import { GnosisSafe } from 'src/types/contracts/gnosis_safe.d'
import { _getChainId } from 'src/config'

import { checksumAddress } from 'src/utils/checksumAddress'
import { proposeTransaction, TransactionDetails } from '@gnosis.pm/safe-react-gateway-sdk'
import { GATEWAY_URL } from 'src/utils/constants'
import { generateSafeTxHash } from '../store/actions/transactions/utils/transactionHelpers'
import { getPolyjuiceProvider } from 'src/logic/wallets/getWeb3'

const calculateBodyFrom = async (
  safeInstance: GnosisSafe,
  to,
  valueInWei,
  data,
  operation,
  nonce,
  safeTxGas,
  baseGas,
  gasPrice,
  gasToken,
  refundReceiver,
  sender,
  origin,
  signature,
) => {
  const safeTxHash = await safeInstance.methods
    .getTransactionHash(to, valueInWei, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce)
    .call()

  console.log('calculateBodyFrom safeTxHash', {
    to,
    valueInWei,
    data,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
    safeTxHash,
  })

  const web3Provider = getPolyjuiceProvider()

  const shortAddress = await web3Provider.godwoker.getShortAddressByAllTypeEthAddress(sender)

  return {
    to: checksumAddress(to),
    value: valueInWei,
    data,
    operation,
    nonce: nonce.toString(),
    safeTxGas: safeTxGas.toString(),
    baseGas: baseGas.toString(),
    gasPrice,
    gasToken,
    refundReceiver,
    safeTxHash,
    sender: checksumAddress(shortAddress.value),
    origin,
    signature,
  }
}

interface SaveTxToHistoryArgs {
  safeInstance: GnosisSafe
  [key: string]: any
}

export const saveTxToHistory = async ({
  baseGas,
  data,
  gasPrice,
  gasToken,
  nonce,
  operation,
  origin,
  refundReceiver,
  safeInstance,
  safeTxGas,
  sender,
  signature,
  to,
  valueInWei,
}: SaveTxToHistoryArgs): Promise<TransactionDetails> => {
  const address = checksumAddress(safeInstance.options.address)
  const body = await calculateBodyFrom(
    safeInstance,
    to,
    valueInWei,
    data,
    operation,
    nonce,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    sender,
    origin || null,
    signature,
  )
  const txDetails = await proposeTransaction(GATEWAY_URL, _getChainId(), address, body)
  return txDetails
}
