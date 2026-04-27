import { BevyApi } from '../bevy-api'
import type { SignedFetchMeta } from '../bevy-api/interface'
import {
  COMMUNITIES_BASE_URL,
  COMMUNITIES_TEST_BASE_URL,
  CommunityModerationError,
  MEMBERS_BASE_URL,
  MEMBERS_TEST_BASE_URL,
  type CommunityData,
  type CommunityInviteEntry,
  type CommunityListItem,
  type CommunityMember,
  type CommunityModerationResponse,
  type CommunityPost,
  type CreateCommunityRequest,
  type GetCommunitiesParams,
  type GetMembersParams,
  type InviteRequestAction,
  type InviteRequestIntention,
  type PaginatedResponse,
  type UserInviteRequest
} from '../service/communities-types'
import { getRealm } from '~system/Runtime'
import { LOCAL_PREVIEW_REALM_NAME } from './constants'
import { createTtlCache } from './ttl-cache'
import {
  type EventFromApi,
  type PlaceFromApi
} from '../ui-classes/scene-info-card/SceneInfoCard.types'
import { fetchPlaceFromApi } from './promise-utils'
import { getPlayer } from '@dcl/sdk/src/players'

const emptyMeta: SignedFetchMeta = {}
const meta: string = JSON.stringify(emptyMeta)

const state = {
  baseURL: COMMUNITIES_BASE_URL,
  membersBaseURL: MEMBERS_BASE_URL,
  initialized: false
}

async function resolveBaseURL(): Promise<string> {
  if (!state.initialized) {
    const { realmInfo } = await getRealm({})
    if (realmInfo?.realmName === LOCAL_PREVIEW_REALM_NAME) {
      state.baseURL = COMMUNITIES_TEST_BASE_URL
      state.membersBaseURL = MEMBERS_TEST_BASE_URL
    }
    state.initialized = true
  }
  return state.baseURL
}

async function resolveMembersBaseURL(): Promise<string> {
  await resolveBaseURL()
  return state.membersBaseURL
}

async function signedGet(url: string): Promise<any> {
  const result = await BevyApi.kernelFetch({
    url,
    init: {
      headers: { 'Content-Type': 'application/json' },
      method: 'GET'
    },
    meta
  })
  if (!result.ok) {
    throw new Error(
      `HTTP ${result.status}: ${result.statusText || result.body}`
    )
  }
  const parsed = JSON.parse(result.body)
  return parsed.data ?? parsed
}

async function signedPost(url: string, body?: object): Promise<any> {
  const result = await BevyApi.kernelFetch({
    url,
    init: {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined
    },
    meta
  })
  if (!result.ok) {
    throw new Error(
      `HTTP ${result.status}: ${result.statusText || result.body}`
    )
  }
  return result.body.length > 0 ? JSON.parse(result.body) : null
}

async function signedDelete(url: string): Promise<void> {
  const result = await BevyApi.kernelFetch({
    url,
    init: {
      headers: { 'Content-Type': 'application/json' },
      method: 'DELETE'
    },
    meta
  })
  if (!result.ok) {
    throw new Error(
      `HTTP ${result.status}: ${result.statusText || result.body}`
    )
  }
}

async function signedPatch(url: string, body?: object): Promise<void> {
  const result = await BevyApi.kernelFetch({
    url,
    init: {
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : undefined
    },
    meta
  })
  if (!result.ok) {
    throw new Error(
      `HTTP ${result.status}: ${result.statusText || result.body}`
    )
  }
}

/**
 * Send a `multipart/form-data` request built from a record of text fields.
 * Text-only — `BevyApi.kernelFetch.body` is a `string`, so a binary file
 * part isn't sent (the backend's optional `thumbnail` part is skipped).
 *
 * Throws `CommunityModerationError` when the backend responds with HTTP 400
 * and a `moderationData` payload (per-field issues).
 */
async function signedMultipart(
  url: string,
  fields: Record<string, string>,
  method: 'POST' | 'PUT' = 'POST'
): Promise<any> {
  const boundary = `----dcl${Date.now()}${Math.floor(Math.random() * 1e9)}`
  const parts: string[] = []
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
        `${value}\r\n`
    )
  }
  parts.push(`--${boundary}--\r\n`)
  const body = parts.join('')

  const result = await BevyApi.kernelFetch({
    url,
    init: {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      method,
      body
    },
    meta
  })

  if (!result.ok) {
    if (result.status === 400 && result.body.length > 0) {
      try {
        const parsed = JSON.parse(result.body)
        const moderation: CommunityModerationResponse | undefined =
          parsed.moderationData ?? parsed.data?.moderationData
        const issues = moderation?.data?.issues
        if (issues != null) {
          throw new CommunityModerationError(
            moderation?.message ??
              'This content violates the Community Content Policy.',
            issues
          )
        }
      } catch (parseError) {
        if (parseError instanceof CommunityModerationError) throw parseError
      }
    }
    throw new Error(
      `HTTP ${result.status}: ${result.statusText || result.body}`
    )
  }
  return result.body.length > 0 ? JSON.parse(result.body) : null
}

// --- Communities CRUD ---

/**
 * POST /communities — create a new community.
 *
 * Returns the new `CommunityData` on success. Throws
 * `CommunityModerationError` if the backend's content-policy check rejects
 * any field (the caller can render per-field messages from `error.issues`).
 */
function buildCommunityFields(
  request: CreateCommunityRequest
): Record<string, string> {
  const fields: Record<string, string> = {
    name: request.name,
    description: request.description,
    privacy: request.privacy,
    visibility: request.visibility
  }
  if (request.placeIds != null && request.placeIds.length > 0) {
    fields.placeIds = JSON.stringify(request.placeIds)
  }
  return fields
}

export async function createCommunity(
  request: CreateCommunityRequest
): Promise<CommunityData> {
  const base = await resolveBaseURL()
  const response = await signedMultipart(
    base,
    buildCommunityFields(request),
    'POST'
  )
  return (response?.data ?? response) as CommunityData
}

/**
 * PUT /communities/{id} — owner-only edit. Same multipart contract as
 * create; throws `CommunityModerationError` on policy rejection.
 */
export async function updateCommunity(
  communityId: string,
  request: CreateCommunityRequest
): Promise<CommunityData> {
  const base = await resolveBaseURL()
  const response = await signedMultipart(
    `${base}/${communityId}`,
    buildCommunityFields(request),
    'PUT'
  )
  return (response?.data ?? response) as CommunityData
}

/**
 * DELETE /communities/{id} — owner-only.
 */
export async function deleteCommunity(communityId: string): Promise<void> {
  const base = await resolveBaseURL()
  await signedDelete(`${base}/${communityId}`)
}

export async function fetchCommunities(
  params: GetCommunitiesParams = {}
): Promise<PaginatedResponse<CommunityListItem>> {
  const base = await resolveBaseURL()
  const parts: string[] = []
  if (params.search != null)
    parts.push(`search=${encodeURIComponent(params.search)}`)
  if (params.onlyMemberOf === true) parts.push('onlyMemberOf=true')
  if (params.offset != null) parts.push(`offset=${params.offset}`)
  if (params.limit != null) parts.push(`limit=${params.limit}`)
  const qs = parts.join('&')
  return await signedGet(`${base}${qs.length > 0 ? `?${qs}` : ''}`)
}

export async function fetchMyCommunities(
  offset = 0,
  limit = 50
): Promise<PaginatedResponse<CommunityListItem>> {
  return await fetchCommunities({ onlyMemberOf: true, offset, limit })
}

export async function fetchCommunity(
  communityId: string
): Promise<CommunityData> {
  const base = await resolveBaseURL()
  return await signedGet(`${base}/${communityId}`)
}

// --- Join / Leave ---

export async function joinCommunity(communityId: string): Promise<void> {
  const base = await resolveBaseURL()
  await signedPost(`${base}/${communityId}/members`)
}

export async function leaveCommunity(
  communityId: string,
  userId: string
): Promise<void> {
  const base = await resolveBaseURL()
  await signedDelete(`${base}/${communityId}/members/${userId}`)
}

/** Drop the cached members of `communityId` so the next fetch re-hits the API. */
export function invalidateCommunityMembersCache(communityId: string): void {
  for (const [key] of membersCache.entries()) {
    if (key.startsWith(`${communityId}:`)) membersCache.invalidate(key)
  }
}

/**
 * DELETE /communities/{id}/members/{address} — owner/moderator action.
 * (Same endpoint as `leaveCommunity`; the backend distinguishes by caller
 * identity vs. target address.)
 */
export async function kickMember(
  communityId: string,
  address: string
): Promise<void> {
  const base = await resolveBaseURL()
  await signedDelete(`${base}/${communityId}/members/${address}`)
  invalidateCommunityMembersCache(communityId)
}

/** POST /communities/{id}/members/{address}/bans — owner/moderator action. */
export async function banMember(
  communityId: string,
  address: string
): Promise<void> {
  const base = await resolveBaseURL()
  await signedPost(`${base}/${communityId}/members/${address}/bans`)
  invalidateCommunityMembersCache(communityId)
}

/** DELETE /communities/{id}/members/{address}/bans — owner/moderator action. */
export async function unbanMember(
  communityId: string,
  address: string
): Promise<void> {
  const base = await resolveBaseURL()
  await signedDelete(`${base}/${communityId}/members/${address}/bans`)
  invalidateCommunityMembersCache(communityId)
}

/**
 * PATCH /communities/{id}/members/{address} — change a member's role.
 * Owner-only:
 *   - 'moderator' to promote a member
 *   - 'member' to demote a moderator
 *   - 'owner' to transfer ownership (the previous owner becomes a member)
 */
export async function setMemberRole(
  communityId: string,
  address: string,
  role: 'owner' | 'moderator' | 'member'
): Promise<void> {
  const base = await resolveBaseURL()
  await signedPatch(`${base}/${communityId}/members/${address}`, { role })
  invalidateCommunityMembersCache(communityId)
}

// --- Members ---

const membersCache = createTtlCache<PaginatedResponse<CommunityMember>>()

/**
 * GET /communities/{id}/bans — owner/moderator action. Returns the
 * banned users in member-shaped DTOs (same fields as `CommunityMember`).
 */
export async function fetchCommunityBans(
  communityId: string,
  params: GetMembersParams = {}
): Promise<PaginatedResponse<CommunityMember>> {
  const base = await resolveBaseURL()
  const parts: string[] = []
  if (params.offset != null) parts.push(`offset=${params.offset}`)
  if (params.limit != null) parts.push(`limit=${params.limit}`)
  const qs = parts.join('&')
  return await signedGet(
    `${base}/${communityId}/bans${qs.length > 0 ? `?${qs}` : ''}`
  )
}

/**
 * GET /communities/{id}/requests?type=invite — owner/moderator action.
 * Returns pending invites this community has sent to other addresses.
 */
export async function fetchCommunityInvites(
  communityId: string,
  params: GetMembersParams = {}
): Promise<PaginatedResponse<CommunityInviteEntry>> {
  const base = await resolveBaseURL()
  const parts: string[] = ['type=invite']
  if (params.offset != null) parts.push(`offset=${params.offset}`)
  if (params.limit != null) parts.push(`limit=${params.limit}`)
  return await signedGet(
    `${base}/${communityId}/requests?${parts.join('&')}`
  )
}

export async function fetchCommunityMembers(
  communityId: string,
  params: GetMembersParams = {}
): Promise<PaginatedResponse<CommunityMember>> {
  const cacheKey = `${communityId}:${params.offset ?? 0}:${
    params.limit ?? ''
  }:${params.onlyOnline ?? ''}`
  const cached = membersCache.get(cacheKey)
  if (cached != null) return cached
  const base = await resolveBaseURL()
  const parts: string[] = []
  if (params.offset != null) parts.push(`offset=${params.offset}`)
  if (params.limit != null) parts.push(`limit=${params.limit}`)
  if (params.onlyOnline === true) parts.push('onlyOnline=true')
  const qs = parts.join('&')
  const result: PaginatedResponse<CommunityMember> = await signedGet(
    `${base}/${communityId}/members${qs.length > 0 ? `?${qs}` : ''}`
  )
  membersCache.set(cacheKey, result)
  return result
}

// --- Places ---

const placeIdsCache = createTtlCache<string[]>()

export async function fetchCommunityPlaceIds(
  communityId: string
): Promise<string[]> {
  const cached = placeIdsCache.get(communityId)
  if (cached != null) return cached
  const base = await resolveBaseURL()
  const response: { results: Array<{ id: string }>; total: number } =
    await signedGet(`${base}/${communityId}/places`)
  const ids = (response.results ?? []).map((r) => r.id)
  placeIdsCache.set(communityId, ids)
  return ids
}

const resolvedPlacesCache = createTtlCache<PlaceFromApi[]>()

export async function fetchCommunityPlaces(
  communityId: string
): Promise<PlaceFromApi[]> {
  const cached = resolvedPlacesCache.get(communityId)
  if (cached != null) return cached
  const placeIds = await fetchCommunityPlaceIds(communityId)
  const resolved = await Promise.all(
    placeIds.map(async (id) => await fetchPlaceFromApi(id).catch(() => null))
  )
  const places = resolved.filter((p): p is PlaceFromApi => p != null)
  resolvedPlacesCache.set(communityId, places)
  return places
}

/**
 * Replace a cached place by id, applying a partial update.
 * Builds a new array + new object (no mutation, safe with frozen state).
 */
export function updateCachedCommunityPlace(
  id: string,
  partial: Partial<PlaceFromApi>
): void {
  for (const [key, places] of resolvedPlacesCache.entries()) {
    const idx = places.findIndex((p) => p.id === id)
    if (idx === -1) continue
    const next = [...places]
    next[idx] = { ...places[idx], ...partial }
    resolvedPlacesCache.set(key, next)
  }
}

// --- Events ---

const eventsCache = createTtlCache<EventFromApi[]>()
const EVENTS_BASE = 'https://events.decentraland.org/api/events'

export async function fetchCommunityEvents(
  communityId: string,
  limit = 20,
  offset = 0
): Promise<EventFromApi[]> {
  const cacheKey = `${communityId}:${limit}:${offset}`
  const cached = eventsCache.get(cacheKey)
  if (cached != null) return cached
  const result = await BevyApi.kernelFetch({
    url: `${EVENTS_BASE}?community_id=${encodeURIComponent(
      communityId
    )}&limit=${limit}&offset=${offset}`,
    init: {
      headers: { 'Content-Type': 'application/json' },
      method: 'GET'
    },
    meta
  })
  if (!result.ok) {
    throw new Error(
      `HTTP ${result.status}: ${result.statusText || result.body}`
    )
  }
  const parsed = JSON.parse(result.body)
  // Response shape: { data: { events: [...], total: N } }
  const events = (parsed.data?.events ?? parsed.events ?? []) as EventFromApi[]
  eventsCache.set(cacheKey, events)
  return events
}

/**
 * Replace a cached event by id, applying a partial update.
 * Builds a new array + new object (no mutation, safe with frozen state).
 */
export function updateCachedCommunityEvent(
  id: string,
  partial: Partial<EventFromApi>
): void {
  for (const [key, events] of eventsCache.entries()) {
    const idx = events.findIndex((e) => e.id === id)
    if (idx === -1) continue
    const next = [...events]
    next[idx] = { ...events[idx], ...partial }
    eventsCache.set(key, next)
  }
}

// --- Photos (Camera Reel) ---

export type CommunityPhoto = {
  id: string
  url: string
  thumbnailUrl: string
}

const CAMERA_REEL_PLACES_BASE =
  'https://camera-reel-service.decentraland.org/api/places'

const photosCache = createTtlCache<CommunityPhoto[]>()

export async function fetchCommunityPhotos(
  placeIds: string[],
  limit = 30,
  offset = 0
): Promise<CommunityPhoto[]> {
  if (placeIds.length === 0) return []
  const cacheKey = `${placeIds.join(',')}:${limit}:${offset}`
  const cached = photosCache.get(cacheKey)
  if (cached != null) return cached
  const result = await BevyApi.kernelFetch({
    url: `${CAMERA_REEL_PLACES_BASE}/images?limit=${limit}&offset=${offset}`,
    init: {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ placesIds: placeIds })
    },
    meta
  })
  if (!result.ok) {
    throw new Error(
      `HTTP ${result.status}: ${result.statusText || result.body}`
    )
  }
  const parsed = JSON.parse(result.body)
  const photos = (parsed.images ?? []) as CommunityPhoto[]
  photosCache.set(cacheKey, photos)
  return photos
}

// --- Posts (Announcements) ---

const postsCache = createTtlCache<{ posts: CommunityPost[] }>()

/** Drop the cached posts for `communityId` so the next fetch re-hits the API. */
export function invalidateCommunityPostsCache(communityId: string): void {
  for (const [key] of postsCache.entries()) {
    if (key.startsWith(`${communityId}:`)) postsCache.invalidate(key)
  }
}

/**
 * POST /communities/{id}/posts — owner/moderator only.
 * Returns the freshly created post.
 */
export async function createCommunityPost(
  communityId: string,
  content: string
): Promise<CommunityPost> {
  const base = await resolveBaseURL()
  const response = await signedPost(`${base}/${communityId}/posts`, {
    content
  })
  invalidateCommunityPostsCache(communityId)
  // The backend's POST response omits the like fields (and may omit the
  // community id too), so merge in zero/false defaults — otherwise the
  // freshly-prepended post renders `undefined` likes and NaN on toggle.
  const created: Partial<CommunityPost> = response?.data ?? response ?? {}
  const post: CommunityPost = {
    ...(created as CommunityPost),
    communityId: created.communityId ?? communityId,
    likesCount: created.likesCount ?? 0,
    isLikedByUser: created.isLikedByUser ?? false
  }
  return post
}

/**
 * DELETE /communities/{id}/posts/{postId} — owner can delete any, the
 * author can delete their own; per-row gating is up to the caller.
 */
export async function deleteCommunityPost(
  communityId: string,
  postId: string
): Promise<void> {
  const base = await resolveBaseURL()
  await signedDelete(`${base}/${communityId}/posts/${postId}`)
  invalidateCommunityPostsCache(communityId)
}

export async function likeCommunityPost(
  communityId: string,
  postId: string
): Promise<void> {
  const base = await resolveBaseURL()
  await signedPost(`${base}/${communityId}/posts/${postId}/like`)
}

export async function unlikeCommunityPost(
  communityId: string,
  postId: string
): Promise<void> {
  const base = await resolveBaseURL()
  await signedDelete(`${base}/${communityId}/posts/${postId}/like`)
}

export async function fetchCommunityPosts(
  communityId: string,
  offset = 0,
  limit = 20
): Promise<{ posts: CommunityPost[] }> {
  const cacheKey = `${communityId}:${offset}:${limit}`
  const cached = postsCache.get(cacheKey)
  if (cached != null) return cached
  const base = await resolveBaseURL()
  const result: { posts: CommunityPost[] } = await signedGet(
    `${base}/${communityId}/posts?offset=${offset}&limit=${limit}`
  )
  postsCache.set(cacheKey, result)
  return result
}

// --- Invites & requests ---

const userRequestsCache = createTtlCache<UserInviteRequest[]>(60 * 1000)

/** Drop the cached `fetchUserInviteRequests` results so the next call re-hits the API. */
export function invalidateUserInviteRequestsCache(): void {
  userRequestsCache.clear()
}

/**
 * GET /members/{me}/requests?type=invite|request_to_join
 * Returns the communities that have invited me (when `type='invite'`) or
 * the ones I've requested to join (when `type='request_to_join'`).
 *
 * Cached for 60 s; call `invalidateUserInviteRequestsCache()` after a write.
 */
export async function fetchUserInviteRequests(
  type: InviteRequestAction
): Promise<UserInviteRequest[]> {
  const cached = userRequestsCache.get(type)
  if (cached != null) return cached
  const membersBase = await resolveMembersBaseURL()
  const address = (getPlayer()?.userId ?? '').toLowerCase()
  if (address.length === 0) return []
  const response: { results: UserInviteRequest[]; total: number } =
    await signedGet(`${membersBase}/${address}/requests?type=${type}`)
  const list = response.results ?? []
  userRequestsCache.set(type, list)
  return list
}

/**
 * PATCH /communities/{communityId}/requests/{requestId}
 * Used to accept/reject an invite, or cancel a request I sent.
 */
export async function manageInviteRequest(
  communityId: string,
  requestId: string,
  intention: InviteRequestIntention
): Promise<void> {
  const base = await resolveBaseURL()
  await signedPatch(`${base}/${communityId}/requests/${requestId}`, {
    intention
  })
}

/**
 * POST /communities/{communityId}/requests
 * Sends an invite to another address (`action='invite'`) or requests to join
 * a private community for the current user (`action='request_to_join'`).
 */
export async function sendInviteOrRequestToJoin(
  communityId: string,
  targetedAddress: string,
  action: InviteRequestAction
): Promise<void> {
  const base = await resolveBaseURL()
  await signedPost(`${base}/${communityId}/requests`, {
    targetedAddress,
    type: action
  })
}
