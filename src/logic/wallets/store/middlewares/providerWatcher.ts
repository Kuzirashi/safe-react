import closeSnackbar from 'src/logic/notifications/store/actions/closeSnackbar'
import { getProviderInfo, getWeb3Ethereum } from 'src/logic/wallets/getWeb3'
import { fetchProvider } from 'src/logic/wallets/store/actions'
import { ADD_PROVIDER } from 'src/logic/wallets/store/actions/addProvider'
import { REMOVE_PROVIDER } from 'src/logic/wallets/store/actions/removeProvider'

import { loadFromStorage, removeFromStorage, saveToStorage } from 'src/utils/storage'
import { ProviderProps } from '../model/provider'

const watchedActions = [ADD_PROVIDER, REMOVE_PROVIDER]

const LAST_USED_PROVIDER_KEY = 'LAST_USED_PROVIDER'

export const loadLastUsedProvider = async (): Promise<string | undefined> => {
  const lastUsedProvider = await loadFromStorage<string>(LAST_USED_PROVIDER_KEY)

  return lastUsedProvider
}

let watcherInterval
const providerWatcherMware = (store) => (next) => async (action) => {
  const handledAction = next(action)

  if (watchedActions.includes(action.type)) {
    switch (action.type) {
      case ADD_PROVIDER: {
        const currentProviderProps = action.payload.toJS()

        if (watcherInterval) {
          clearInterval(watcherInterval)
        }

        saveToStorage(LAST_USED_PROVIDER_KEY, currentProviderProps.name)

        let lastProviderInfo: ProviderProps | null = null
        watcherInterval = setInterval(async () => {
          if (lastProviderInfo?.polyjuiceAccount) {
            clearInterval(watcherInterval)
          }

          const web3 = getWeb3Ethereum()
          const providerInfo = await getProviderInfo(web3)

          const networkChanged = currentProviderProps.network !== providerInfo.network

          if (networkChanged) {
            store.dispatch(closeSnackbar({ dismissAll: true }))
          }

          if (currentProviderProps.account !== providerInfo.account || networkChanged) {
            store.dispatch(fetchProvider(currentProviderProps.name))
          }

          lastProviderInfo = providerInfo
        }, 3000)

        break
      }
      case REMOVE_PROVIDER:
        clearInterval(watcherInterval)
        if (!action.payload?.keepStorageKey) {
          removeFromStorage(LAST_USED_PROVIDER_KEY)
        }
        break
      default:
        break
    }
  }

  return handledAction
}

export default providerWatcherMware
