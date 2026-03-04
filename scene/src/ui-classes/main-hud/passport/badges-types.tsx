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

/**
 * API is inconsistent across items:
 * - achieved items include lastCompletedTier* (often null)
 * - notAchieved items in your sample only include stepsDone/nextStepsTarget/totalStepsTarget
 * So we model it as a union.
 */
export type AchievementProgress =
  | AchievementProgressTierish
  | AchievementProgressSimple

export interface AchievementProgressTierish {
  achievedTiers?: AchievedTier[] // only present for isTier=true
  stepsDone: number
  nextStepsTarget: number | null
  totalStepsTarget: number
  lastCompletedTierAt: number | null
  lastCompletedTierName: string | null
  lastCompletedTierImage: string | null
}

export interface AchievementProgressSimple {
  stepsDone: number
  nextStepsTarget: number | null
  totalStepsTarget: number
  // explicitly absent in notAchieved sample
  achievedTiers?: undefined
  lastCompletedTierAt?: undefined
  lastCompletedTierName?: undefined
  lastCompletedTierImage?: undefined
}

export interface AchievementItemBase {
  id: string
  name: string
  description: string
  category: AchievementCategory
  isTier: boolean
  assets: AchievementAssets
}

export interface AchievedAchievementItem extends AchievementItemBase {
  completedAt: string | null // API returns string ms or null in your sample
  progress: AchievementProgressTierish // achieved sample always includes tierish fields (often null)
}

export interface NotAchievedAchievementItem extends AchievementItemBase {
  completedAt: null
  progress: AchievementProgressSimple // matches your notAchieved sample
}

export type AchievedItems = AchievedAchievementItem[]
export type NotAchievedItems = NotAchievedAchievementItem[]

export interface AchievementsData {
  achieved: AchievedItems
  notAchieved: NotAchievedItems
}

export interface AchievementsResponse {
  data: AchievementsData
}
