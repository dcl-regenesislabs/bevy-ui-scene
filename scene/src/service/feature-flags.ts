import { BevyApi } from '../bevy-api'

export type FeatureFlags = {
  minimap: boolean
  chat: boolean
  discoverMap: boolean
  notifications: boolean
}

export const FEATURES: Record<string, keyof FeatureFlags> = {
  MINIMAP: 'minimap',
  CHAT: 'chat',
  DISCOVER_MAP: 'discoverMap',
  NOTIFICATIONS: 'notifications'
} as const

const DEFAULT_FLAGS: FeatureFlags = {
  minimap: true,
  chat: true,
  discoverMap: true,
  notifications: true
}

const resolvedFlags: FeatureFlags = { ...DEFAULT_FLAGS }

export async function initFeatureFlags(): Promise<void> {
  try {
    const runtimeFlags = await BevyApi.getFeatureFlags()
    if (runtimeFlags != null) {
      Object.assign(resolvedFlags, runtimeFlags)
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
