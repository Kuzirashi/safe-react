export const useAnalytics = (): any => {
  return { trackPage: () => {}, trackEvent: () => {} }
}

export const SAFE_EVENTS: any = {}
export const SAFE_APP_EVENTS: any = {}
export const SETTINGS_EVENTS: any = {}
export const USER_EVENTS: any = {}