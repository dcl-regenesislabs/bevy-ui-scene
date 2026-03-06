export type AchievementCategory =
  | 'Explorer'
  | 'Collector'
  | 'Creator'
  | 'Socializer'
  | 'Builder'
  | (string & object)

export type AchievementAssetVariant =
  | 'normal'
  | 'hrm'
  | 'basecolor'
  | (string & object)

export type AchievementAssets2D = Partial<
  Record<AchievementAssetVariant, string>
>
export type AchievementAssets3D = Partial<
  Record<AchievementAssetVariant, string>
>

export type AchievementAssets = {
  '2d'?: AchievementAssets2D
  '3d'?: AchievementAssets3D
}

export type AchievedTier = {
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

export type AchievementProgressTierish = {
  achievedTiers?: AchievedTier[] // only present for isTier=true
  stepsDone: number
  nextStepsTarget: number | null
  totalStepsTarget: number
  lastCompletedTierAt: number | null
  lastCompletedTierName: string | null
  lastCompletedTierImage: string | null
}

export type AchievementProgressSimple = {
  stepsDone: number
  nextStepsTarget: number | null
  totalStepsTarget: number
  // explicitly absent in notAchieved sample
  achievedTiers?: undefined
  lastCompletedTierAt?: undefined
  lastCompletedTierName?: undefined
  lastCompletedTierImage?: undefined
}

export type AchievementItemBase = {
  id: string
  name: string
  description: string
  category: AchievementCategory
  isTier: boolean
  assets: AchievementAssets
}

export type AchievedAchievementItem = {
  completedAt: string | null // API returns string ms or null in your sample
  progress: AchievementProgressTierish // achieved sample always includes tierish fields (often null)
} & AchievementItemBase

export type NotAchievedAchievementItem = {
  completedAt: null
  progress: AchievementProgressSimple // matches your notAchieved sample
} & AchievementItemBase

export type AchievedItems = AchievedAchievementItem[]
export type NotAchievedItems = NotAchievedAchievementItem[]

export type AchievementsData = {
  achieved: AchievedItems
  notAchieved: NotAchievedItems
}

export type AchievementsResponse = {
  data: AchievementsData
}
