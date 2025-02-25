import { CHAIN_ID } from 'src/config/chain.d'

export const APP_ENV = process.env.REACT_APP_ENV
export const NODE_ENV = process.env.NODE_ENV
export const IS_PRODUCTION = APP_ENV === 'production'
export const DEFAULT_CHAIN_ID = IS_PRODUCTION ? CHAIN_ID.GODWOKEN_MAINNET : CHAIN_ID.GODWOKEN_MAINNET
export const PUBLIC_URL = process.env.PUBLIC_URL
export const TX_SERVICE_VERSION = '1'
export const SAFE_APPS_RPC_TOKEN = process.env.REACT_APP_SAFE_APPS_RPC_INFURA_TOKEN || ''
export const LATEST_SAFE_VERSION = process.env.REACT_APP_LATEST_SAFE_VERSION || '1.3.0'
export const APP_VERSION = process.env.REACT_APP_APP_VERSION || 'not-defined'
export const COLLECTIBLES_SOURCE = process.env.REACT_APP_COLLECTIBLES_SOURCE || 'Gnosis'
export const SAFE_POLLING_INTERVAL = process.env.NODE_ENV === 'test' ? 4500 : 15000
export const IPFS_GATEWAY = process.env.REACT_APP_IPFS_GATEWAY
export const SPENDING_LIMIT_MODULE_ADDRESS =
  process.env.REACT_APP_SPENDING_LIMIT_MODULE_ADDRESS || '0xCFbFaC74C26F8647cBDb8c5caf80BB5b32E43134'

// localStorage-related constants
export const LS_NAMESPACE = 'SAFE'
export const LS_SEPARATOR = '__'
export const LS_USE_PROD_CGW = 'useProdGateway'

// For debugging on dev
const isProdGateway = () => {
  try {
    return localStorage.getItem(`${LS_NAMESPACE}${LS_SEPARATOR}${LS_USE_PROD_CGW}`) === 'true'
  } catch (e) {
    return false
  }
}

export const GATEWAY_URL =
  process.env.REACT_APP_GATEWAY_URL ||
  (IS_PRODUCTION || isProdGateway() ? 'https://safe-client.gnosis.io' : 'http://localhost:8001')
