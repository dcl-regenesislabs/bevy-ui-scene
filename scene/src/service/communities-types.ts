/**
 * Types for the Communities REST API.
 * Base URL: https://social-api.decentraland.{ENV}/v1/communities
 *
 * Reference: unity-explorer CommunitiesDataProvider DTOs.
 */

export type CommunityPrivacy = 'public' | 'private'
export type CommunityVisibility = 'all' | 'unlisted'
export type CommunityMemberRole =
  | 'owner'
  | 'moderator'
  | 'member'
  | 'none'
  | 'unknown'

export type CommunityData = {
  id: string
  name: string
  description: string
  thumbnailUrl: string
  ownerAddress: string
  privacy: CommunityPrivacy
  visibility: CommunityVisibility
  role: CommunityMemberRole
  membersCount: number
  active: boolean
}

export type CommunityListItem = CommunityData & {
  ownerName: string
  friends: CommunityFriendInfo[]
}

export type CommunityFriendInfo = {
  address: string
  name: string
  profilePictureUrl: string
}

export type CommunityMember = {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl: string
  role: CommunityMemberRole
  joinedAt: string
  mutualFriends: number
}

export type PaginatedResponse<T> = {
  results: T[]
  total: number
  page: number
  pages: number
  limit: number
}

export type GetCommunitiesParams = {
  search?: string
  onlyMemberOf?: boolean
  offset?: number
  limit?: number
}

export type GetMembersParams = {
  offset?: number
  limit?: number
  onlyOnline?: boolean
}

export type CommunityPost = {
  id: string
  communityId: string
  authorAddress: string
  authorName: string
  authorProfilePictureUrl: string
  authorHasClaimedName: boolean
  content: string
  createdAt: string
  likesCount: number
  isLikedByUser: boolean
}

// API base URLs
export const COMMUNITIES_BASE_URL =
  'https://social-api.decentraland.org/v1/communities'
export const COMMUNITIES_TEST_BASE_URL =
  'https://social-api.decentraland.zone/v1/communities'

export function getCommunityThumbnailUrl(communityId: string): string {
  return `https://assets-cdn.decentraland.org/social/communities/${communityId}/raw-thumbnail.png`
}
