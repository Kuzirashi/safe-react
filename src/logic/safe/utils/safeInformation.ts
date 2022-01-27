import { getSafeInfo as fetchSafeInfo, SafeInfo } from '@gnosis.pm/safe-react-gateway-sdk'

import { Errors, CodedException } from 'src/logic/exceptions/CodedException'
import { _getChainId } from 'src/config'
import { GATEWAY_URL } from 'src/utils/constants'

const GATEWAY_ERROR = /1337|42/

// export const localSafesInfo: SafeInfo = {
//   address: {
//     name: '1',
//     value: '0x87C80d26CD4c8963BB963c69a224356f4138c4F4', // from chain/safes/ID
//     logoUri: null,
//   },
//   chainId: '71393',
//   threshold: 2,
//   owners: [
//     {
//       name: '1',
//       value: '0xD173313A51f8fc37BcF67569b463abd89d81844f',
//       logoUri: null,
//     },
//   ],
//   modules: [],
//   nonce: 492,
//   collectiblesTag: '1634550387',
//   txQueuedTag: '1634550387',
//   txHistoryTag: '1633430459',
//   implementation: {
//     value: '',
//     name: null,
//     logoUri: null,
//   },
//   guard: {
//     value: '',
//     name: null,
//     logoUri: null,
//   },
//   fallbackHandler: {
//     value: '',
//     name: null,
//     logoUri: null,
//   },
//   version: '',
// }

export const getSafeInfo = async (safeAddress: string): Promise<SafeInfo> => {
  try {
    return await fetchSafeInfo(GATEWAY_URL, _getChainId(), safeAddress)
    // return localSafesInfo;
  } catch (e) {
    const safeNotFound = GATEWAY_ERROR.test(e.message)
    throw new CodedException(safeNotFound ? Errors._605 : Errors._613, e.message)
  }
}
