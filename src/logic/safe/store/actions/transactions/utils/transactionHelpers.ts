import { Operation } from '@gnosis.pm/safe-react-gateway-sdk'
import { TypedDataUtils } from 'eth-sig-util'
import { GnosisSafe } from 'src/types/contracts/gnosis_safe.d'

import { TxArgs } from 'src/logic/safe/store/models/types/transaction'
import { getEip712MessageTypes, generateTypedDataFrom } from 'src/logic/safe/transactions/offchainSigner/EIP712Signer'
import { getGnosisSafeInstanceAt } from 'src/logic/contracts/safeContracts'

export const generateSafeTxHash = async (safeAddress: string, safeVersion: string, txArgs: TxArgs): Promise<string> => {
  const typedData = await generateTypedDataFrom({ safeAddress, safeVersion, ...txArgs })

  const messageTypes = getEip712MessageTypes(safeVersion)

  // https://github.com/MetaMask/eth-sig-util/blob/73ace3309bf4b97d901fb66cd61db15eede7afe9/src/sign-typed-data.ts#L388
  // calculate eip712hash
  const result = `0x${TypedDataUtils.sign<typeof messageTypes>(typedData).toString('hex')}`

  console.log('generateSafeTxHash', {
    safeAddress,
    safeVersion,
    txArgs,
    result,
  })

  return result
}

const testFn = async (data = '0x', nonce = 2, approveHash = false) => {
  const safeAddress = '0x4bE2a864C5264486B5C73f766C243FF7F02d58F7'
  const safeVersion = '1.3.0'
  const to = '0x4bE2a864C5264486B5C73f766C243FF7F02d58F7'
  const valueInWei = '0'
  const operation = Operation.CALL
  const safeTxGas = '0'
  const baseGas = '0'
  const gasPrice = '0'
  const gasToken = '0x0000000000000000000000000000000000000000'
  const refundReceiver = '0x0000000000000000000000000000000000000000'
  const sigs = ''
  const safeInstance = getGnosisSafeInstanceAt(safeAddress, safeVersion)

  const calculated = await generateSafeTxHash(safeAddress, safeVersion, {
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
    safeInstance,
    sigs,
  })

  const blockchain = await safeInstance.methods
    .getTransactionHash(to, valueInWei, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce)
    .call()

  const chainId = await safeInstance.methods.getChainId().call()

  // const approvedHashes = await safeInstance.methods
  //   .approvedHashes(
  //     '0x56EACCAA2Ce59c6C0400b1e0b2E70dfd2DDdd166',
  //     '0x7c947f0881f8c2aa0c13f46a5995da266f5ccbc9de3050974ecc4ac641d3fbf5',
  //   )
  //   .call()

  // if (approveHash) {
  //   const tx = await safeInstance.methods
  //     .approveHash('0x7c947f0881f8c2aa0c13f46a5995da266f5ccbc9de3050974ecc4ac641d3fbf5')
  //     .send({
  //       from: '0xd46aC0Bc23dB5e8AfDAAB9Ad35E9A3bA05E092E8',
  //       gas: 6000000,
  //     })

  //   console.log({
  //     tx,
  //   })
  // }

  // const nonceFromBlockchain = await safeInstance.methods.nonce().call()

  // const events = await safeInstance.getPastEvents('ExecutionSuccess', {
  //   fromBlock: 250046,
  // })

  return {
    calculated,
    blockchain,
    chainId,
    // approvedHashes,
    // nonceFromBlockchain,
    // events,
  }
}
;(window as any).testFn = testFn

/**
 * this matches following:
 * 
 * {
    "to": "0x32c4Adb97692adCE3e3BCDd9F3E0Ddc051ec8329",
    "value": "100000000",
    "data": "",
    "operation": 0,
    "nonce": "2",
    "safeTxGas": "0",
    "baseGas": "0",
    "gasPrice": "0",
    "gasToken": "0x0000000000000000000000000000000000000000",
    "refundReceiver": "0x0000000000000000000000000000000000000000",
    "safeTxHash": "0xeb254ce568839e3d67efec2cfd14c030d7e1899bfe1b85d45b7d6df24c0b4ca0",
    "sender": "0x8016DcD1AF7c8CCeda53E4d2D2CD4E2924E245B6",
    "origin": null
}
 */
