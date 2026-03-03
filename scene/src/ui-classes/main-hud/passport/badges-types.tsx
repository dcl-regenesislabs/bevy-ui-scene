export type AchievementCategory =
  | 'Explorer'
  | 'Collector'
  | 'Creator'
  | 'Socializer'
  | 'Builder'
  | (string & {})

export type AchievementAssetVariant =
  | 'normal'
  | 'hrm'
  | 'basecolor'
  | (string & {})

export type AchievementAssets2D = Partial<
  Record<AchievementAssetVariant, string>
>
export type AchievementAssets3D = Partial<
  Record<AchievementAssetVariant, string>
>

export interface AchievementAssets {
  '2d'?: AchievementAssets2D
  '3d'?: AchievementAssets3D
}

export interface AchievedTier {
  tierId: string
  completedAt: number // epoch ms
}

export interface AchievementProgress {
  achievedTiers?: AchievedTier[] // only present for isTier=true
  stepsDone: number
  nextStepsTarget: number | null
  totalStepsTarget: number
  lastCompletedTierAt: number | null
  lastCompletedTierName: string | null
  lastCompletedTierImage: string | null
}

export interface AchievedAchievementItem {
  id: string
  name: string
  description: string
  category: AchievementCategory
  isTier: boolean
  completedAt: string | null // NOTE: API returns string ms or null in your sample
  assets: AchievementAssets
  progress: AchievementProgress
}

export type AchievedItems = AchievedAchievementItem[]
