import { BevyApi } from '../bevy-api'

export type FeatureFlags = {
  minimap: boolean
  chat: boolean
  discoverMap: boolean
  notifications: boolean
  friends: boolean
}

export const FEATURES: Record<string, keyof FeatureFlags> = {
  MINIMAP: 'minimap',
  CHAT: 'chat',
  DISCOVER_MAP: 'discoverMap',
  NOTIFICATIONS: 'notifications',
  FRIENDS: 'friends'
} as const

const DEFAULT_FLAGS: FeatureFlags = {
  minimap: true,
  chat: true,
  discoverMap: true,
  notifications: true,
  friends: true
}

const resolvedFlags: FeatureFlags = { ...DEFAULT_FLAGS }

export async function initFeatureFlags(): Promise<void> {
  try {
    const params = await BevyApi.getParams()
    console.log('getParams', params instanceof Map, params)
    if (params.disableFeatures != null) {
      const disabled = params.disableFeatures.split(',')

      for (const feature of disabled) {
        const key = feature.trim() as keyof FeatureFlags
        if (key in resolvedFlags) {
          resolvedFlags[key] = false
        }
      }
    }
    console.log('[feature-flags] flags:', resolvedFlags)
  } catch (e) {
    console.error(
      '[feature-flags] init failed, defaulting all flags to true',
      e
    )
  }
}

export function getFeatureFlag(flag: keyof FeatureFlags): boolean {
  return resolvedFlags[flag]
}
