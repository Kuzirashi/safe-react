import { Dispatch } from 'redux'

import addProvider from './addProvider'

import { NOTIFICATIONS, enhanceSnackbarForAction } from 'src/logic/notifications'
import enqueueSnackbar from 'src/logic/notifications/store/actions/enqueueSnackbar'
import { getProviderInfo, getWeb3Ethereum } from 'src/logic/wallets/getWeb3'
import { makeProvider, ProviderProps } from 'src/logic/wallets/store/model/provider'

export const processProviderResponse = (dispatch: Dispatch, provider: ProviderProps): void => {
  const walletRecord = makeProvider(provider)
  dispatch(addProvider(walletRecord))
}

const handleProviderNotification = (provider: ProviderProps, dispatch: Dispatch<any>): void => {
  const { available, loaded } = provider

  if (!loaded) {
    dispatch(enqueueSnackbar(enhanceSnackbarForAction(NOTIFICATIONS.CONNECT_WALLET_ERROR_MSG)))
    return
  }

  if (available) {
    // NOTE:
    // if you want to be able to dispatch a `closeSnackbar` action later on,
    // you SHOULD pass your own `key` in the options. `key` can be any sequence
    // of number or characters, but it has to be unique to a given snackbar.

    // Cannot import from useAnalytics here, so using fn directly
  } else {
    dispatch(enqueueSnackbar(enhanceSnackbarForAction(NOTIFICATIONS.UNLOCK_WALLET_MSG)))
  }
}

export default (providerName: string): ((dispatch: Dispatch<any>) => Promise<void>) =>
  async (dispatch: Dispatch<any>) => {
    const web3 = getWeb3Ethereum()
    const providerInfo = await getProviderInfo(web3, providerName)
    handleProviderNotification(providerInfo, dispatch)
    processProviderResponse(dispatch, providerInfo)
  }
