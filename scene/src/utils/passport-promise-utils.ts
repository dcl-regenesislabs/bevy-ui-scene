import { getRealm } from '~system/Runtime'
import { CATALYST_BASE_URL_FALLBACK } from './constants'
import { fetchJsonOrTryFallback } from './promise-utils'
import { type Avatar } from '@dcl/schemas'
import { cloneDeep } from './function-utils'
import { type ViewAvatarData } from '../state/hud/state'
import { BevyApi } from '../bevy-api'
import { showErrorPopup } from '../service/error-popup-service'
import {
  type Address,
  namedUsersData
} from '../ui-classes/main-hud/chat-and-logs/named-users-data-service'
import { getPlayer } from '@dcl/sdk/players'

export type ProfileResponse = {
  timestamp: number
  avatars: Avatar[]
}
export const profileDataMap = new Map<string, ProfileResponse>()

export type ResolvedPlayerData = {
  userId: string
  name: string
  hasClaimedName: boolean
}

/**
 * Resolve basic player data with a graceful fallback chain so it works for
 * users who aren't currently in the scene:
 *
 *   1. `getPlayer({ userId })` — sync, available only for tracked avatars.
 *   2. `fetchProfileData({ userId, useCache: true })` — catalyst lambda,
 *      works for any userId.
 *   3. last resort: returns the address itself as the "name".
 */
export async function resolvePlayerData(
  userId: string
): Promise<ResolvedPlayerData> {
  const player = getPlayer({ userId })
  if (player?.name != null) {
    const name = player.name
    return {
      userId,
      name,
      hasClaimedName: !!(name.length > 0 && !name.includes('#'))
    }
  }
  const profile = await fetchProfileData({ userId, useCache: true })
  const avatar = profile?.avatars?.[0]
  if (avatar != null) {
    return {
      userId,
      name: avatar.name ?? userId,
      hasClaimedName: avatar.hasClaimedName ?? false
    }
  }
  return { userId, name: userId, hasClaimedName: false }
}

export async function fetchProfileData({
  userId,
  useCache = false
}: {
  userId: string
  useCache?: boolean
}): Promise<ProfileResponse> {
  const realm = await getRealm({})
  const catalystBaseURl = realm.realmInfo?.baseUrl ?? CATALYST_BASE_URL_FALLBACK
  const passportDataURL = `${catalystBaseURl}/lambdas/profiles/${userId}`
  if (useCache && profileDataMap.has(userId)) {
    return profileDataMap.get(userId) as ProfileResponse
  } else {
    const result = await fetchJsonOrTryFallback(passportDataURL)
    const hasClaimedName = (result?.avatars ?? []).some(
      (avatar: Avatar) => avatar.hasClaimedName
    )
    const player = getPlayer({ userId })
    if (hasClaimedName && player) {
      namedUsersData.set(player.name.toLowerCase(), userId as Address)
    }
    profileDataMap.set(userId, result)
    return result
  }
}

export type NameDefinition = {
  name: string
  contractAddress: string
  tokenId: string
}

const namesCache = new Map<string, NameDefinition[]>()

export async function fetchAllUserNames({
  userId
}: {
  userId: string
}): Promise<NameDefinition[]> {
  if (namesCache.has(userId)) {
    return namesCache.get(userId) as NameDefinition[]
  }
  const realm = await getRealm({})
  const catalystBaseURl = realm.realmInfo?.baseUrl ?? CATALYST_BASE_URL_FALLBACK
  const namesURL = `${catalystBaseURl}/lambdas/users/${userId}/names`
  const response = await fetchJsonOrTryFallback(namesURL)
  return response?.elements ?? []
}

export type ProfileExtra = {
  description: string
  country: string
  language: string
  gender: string
  relationshipStatus: string
  sexualOrientation: string
  employmentStatus: string
  pronouns: string
  profession: string
  birthdate: number
  hobbies: string
  links: Array<{ url: string; title: string }>
  tutorialStep: number
  blocked: string[]
  interests: string[]
  realName: string
  unclaimedName: string
  email: string
}

export const saveProfileData = async (
  profileData: ViewAvatarData
): Promise<void> => {
  const profileExtras = fromViewAvatarDataToProfileExtra(profileData)

  await BevyApi.setAvatar({
    profileExtras
  }).catch(showErrorPopup)
}

function fromViewAvatarDataToProfileExtra(
  profileData: ViewAvatarData
): ProfileExtra {
  const profileExtras: ProfileExtra = {
    description: profileData.description ?? 'No intro.',
    country: profileData.country ?? '',
    language: profileData.language ?? '',
    gender: profileData.gender ?? '',
    relationshipStatus: profileData.relationshipStatus ?? '',
    sexualOrientation: profileData.sexualOrientation ?? '',
    employmentStatus: profileData.employmentStatus ?? '',
    pronouns: profileData.pronouns ?? '',
    profession: profileData.profession ?? '',
    birthdate: profileData.birthdate ?? 0,
    hobbies: profileData.hobbies ?? '',
    links: cloneDeep(profileData.links ?? []),
    tutorialStep: profileData.tutorialStep ?? 0,
    blocked: profileData.blocked ?? [],
    interests: profileData.interests ?? [],
    realName: profileData.realName ?? '',
    unclaimedName: profileData.unclaimedName ?? '',
    email: profileData.email ?? ''
  }

  return profileExtras
}
