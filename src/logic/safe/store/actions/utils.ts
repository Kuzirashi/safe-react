import { GnosisSafe } from 'src/types/contracts/gnosis_safe.d'

import { LATEST_SAFE_VERSION } from 'src/utils/constants'
import { SafeRecordProps } from 'src/logic/safe/store/models/safe'
import { getSpendingLimits } from 'src/logic/safe/utils/spendingLimits'
import { buildModulesLinkedList } from 'src/logic/safe/utils/modules'
import { enabledFeatures, safeNeedsUpdate } from 'src/logic/safe/utils/safeVersion'
import { checksumAddress } from 'src/utils/checksumAddress'
import { ChainId } from 'src/config/chain.d'
import { AddressEx, SafeInfo } from '@gnosis.pm/safe-react-gateway-sdk'
import {
  Transaction,
  isMultisigExecutionInfo,
  LocalTransactionStatus,
} from 'src/logic/safe/store/models/types/gateway.d'
import { getPolyjuiceProvider, getWeb3, setPolyjuiceProvider } from 'src/logic/wallets/getWeb3'

export const shouldExecuteTransaction = async (
  safeInstance: GnosisSafe,
  nonce: string,
  lastTx: Transaction | null,
): Promise<boolean> => {
  const safeNonce = (await safeInstance.methods.nonce().call()).toString()
  const thresholdAsString = await safeInstance.methods.getThreshold().call()
  const threshold = Number(thresholdAsString)

  // Needs to collect owners signatures
  if (threshold > 1) {
    return false
  }

  // Allow first tx.
  if (Number(nonce) === 0) {
    return true
  }

  // Allow if nonce === safeNonce and threshold === 1
  if (nonce === safeNonce) {
    return true
  }

  // If the previous tx is not executed or the different between lastTx.nonce and nonce is > 1
  // it's delayed using the approval mechanisms.
  // Once the previous tx is executed, the current tx will be available to be executed
  // by the user using the exec button.
  if (lastTx && isMultisigExecutionInfo(lastTx.executionInfo)) {
    return lastTx.txStatus === LocalTransactionStatus.SUCCESS && lastTx.executionInfo.nonce + 1 === Number(nonce)
  }

  return false
}

/**
 * Recovers Safe's remote information along with its modules and spendingLimits if there's any
 * @param {SafeInfo} remoteSafeInfo
 * @returns Promise<Partial<SafeRecordProps>>
 */
export const extractRemoteSafeInfo = async (remoteSafeInfo: SafeInfo): Promise<Partial<SafeRecordProps>> => {
  const safeInfo: Partial<SafeRecordProps> = {
    modules: undefined,
    spendingLimits: undefined,
  }
  const safeInfoModules = (remoteSafeInfo.modules || []).map(({ value }) => value)

  if (safeInfoModules.length) {
    safeInfo.modules = buildModulesLinkedList(safeInfoModules)
    try {
      safeInfo.spendingLimits = await getSpendingLimits(safeInfoModules, remoteSafeInfo.address.value)
    } catch (e) {
      e.log()
      safeInfo.spendingLimits = null
    }
  }

  // console.log('safeInfo.currentVersion = remoteSafeInfo.version', {
  //   a: safeInfo.currentVersion,
  //   b: remoteSafeInfo.version,
  //   remoteSafeInfo,
  // })

  safeInfo.nonce = remoteSafeInfo.nonce
  safeInfo.threshold = remoteSafeInfo.threshold
  safeInfo.currentVersion = remoteSafeInfo.version
  safeInfo.needsUpdate = safeNeedsUpdate(safeInfo.currentVersion, LATEST_SAFE_VERSION)
  safeInfo.featuresEnabled = enabledFeatures(safeInfo.currentVersion)
  safeInfo.guard = remoteSafeInfo.guard ? remoteSafeInfo.guard.value : undefined
  safeInfo.collectiblesTag = remoteSafeInfo.collectiblesTag
  safeInfo.txQueuedTag = remoteSafeInfo.txQueuedTag
  safeInfo.txHistoryTag = remoteSafeInfo.txHistoryTag
  safeInfo.chainId = remoteSafeInfo.chainId as ChainId

  return safeInfo
}

/**
 * Merges remote owner's information with the locally stored data.
 * If there's no remote data, it will go with the locally stored information.
 * @param {SafeInfo['owners'] | undefined} remoteSafeOwners
 * @param {SafeRecordProps['owners'] | undefined} localSafeOwners
 * @returns SafeRecordProps['owners'] | undefined
 */
export const buildSafeOwners = async (
  remoteSafeOwners?: SafeInfo['owners'],
  localSafeOwners?: SafeRecordProps['owners'],
): Promise<SafeRecordProps['owners'] | undefined> => {
  if (remoteSafeOwners) {
    const safeAccountsGodwokenAddresses: string[] = []
    await setPolyjuiceProvider()
    const web3Provider = getPolyjuiceProvider()

    for (const account of remoteSafeOwners) {
      // console.log('account.value', account.value)
      try {
        const shortAddress = await web3Provider.godwoker.getEthAddressByAllTypeShortAddress(account.value)

        if (!shortAddress) {
          throw new Error()
        }

        safeAccountsGodwokenAddresses.push(checksumAddress(shortAddress))
      } catch (error) {
        console.log(
          `[buildSafeOwners] Can't convert Ethereum address: ${account.value} to Godwoken address. Skipping from owners array.`,
        )
      }
    }

    // ToDo: review if checksums addresses is necessary,
    //  as they must be provided already in the checksum form from the services
    return safeAccountsGodwokenAddresses
  }

  // nothing to do without remote owners, so we return the stored list
  return localSafeOwners
}
