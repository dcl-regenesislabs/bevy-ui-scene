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

/**
 * Values returned by the communities API for `friendshipStatus`.
 * Mirror of Unity's `DCL.Communities.CommunitiesDataProvider.DTOs.FriendshipStatus`.
 */
export enum CommunityFriendshipStatus {
  REQUEST_SENT = 0,
  REQUEST_RECEIVED = 1,
  CANCELED = 2,
  FRIEND = 3,
  REJECTED = 4,
  DELETED = 5,
  BLOCKED = 6,
  NONE = 7,
  BLOCKED_BY = 8
}

export type CommunityMember = {
  communityId: string
  memberAddress: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl: string
  role: CommunityMemberRole
  joinedAt: string
  friendshipStatus?: CommunityFriendshipStatus
  lastFriendshipAction?: string | null
  actingUser?: string | null
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

/** POST /communities/{id}/requests — type of invite/request to create */
export type InviteRequestAction = 'invite' | 'request_to_join'

/** PATCH /communities/{id}/requests/{requestId} — intention body */
export type InviteRequestIntention = 'accepted' | 'rejected' | 'cancelled'

/** Entry returned by GET /members/{address}/requests?type=… */
export type UserInviteRequest = {
  id: string
  communityId: string
  memberAddress: string
  type: InviteRequestAction
  status: string
  name: string
  description: string
  ownerAddress: string
  ownerName: string
  role: CommunityMemberRole
  privacy: CommunityPrivacy
  active: boolean
  membersCount: number
  friends?: CommunityFriendInfo[]
  thumbnailUrl?: string
}

// API base URLs
export const COMMUNITIES_BASE_URL =
  'https://social-api.decentraland.org/v1/communities'
export const COMMUNITIES_TEST_BASE_URL =
  'https://social-api.decentraland.zone/v1/communities'
export const MEMBERS_BASE_URL = 'https://social-api.decentraland.org/v1/members'
export const MEMBERS_TEST_BASE_URL =
  'https://social-api.decentraland.zone/v1/members'

export function getCommunityThumbnailUrl(communityId: string): string {
  return `https://assets-cdn.decentraland.org/social/communities/${communityId}/raw-thumbnail.png`
}

/**
 * Body for `POST /communities` — see unity-explorer
 * `CommunitiesDataProvider.CreateCommunity`. Backend accepts these fields
 * as multipart/form-data; we send the same names but as text-only parts
 * (BevyApi.kernelFetch can't carry the binary `thumbnail` part yet).
 */
export type CreateCommunityRequest = {
  name: string
  description: string
  privacy: CommunityPrivacy
  visibility: CommunityVisibility
  /** Optional — list of place ids the owner wants to associate. */
  placeIds?: string[]
}

/**
 * Per-field issues returned by the social API when content moderation rejects
 * a create/update. Mirror of `CommunityModerationIssues` in unity-explorer.
 */
export type CommunityModerationIssues = {
  name?: string[]
  description?: string[]
  image?: string[]
}

export type CommunityModerationResponse = {
  error?: string
  message?: string
  communityContentValidationUnavailable?: boolean
  data?: { issues?: CommunityModerationIssues }
}

/** Thrown by `createCommunity` when the backend rejects content. */
export class CommunityModerationError extends Error {
  readonly issues: CommunityModerationIssues
  constructor(message: string, issues: CommunityModerationIssues) {
    super(message)
    this.name = 'CommunityModerationError'
    this.issues = issues
  }
}
