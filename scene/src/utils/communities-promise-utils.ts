import { BevyApi } from '../bevy-api'
import type { SignedFetchMeta } from '../bevy-api/interface'
import {
  COMMUNITIES_BASE_URL,
  COMMUNITIES_TEST_BASE_URL,
  type CommunityData,
  type CommunityListItem,
  type CommunityMember,
  type GetCommunitiesParams,
  type GetMembersParams,
  type PaginatedResponse
} from '../service/communities-types'
import { getRealm } from '~system/Runtime'
import { LOCAL_PREVIEW_REALM_NAME } from './constants'

const emptyMeta: SignedFetchMeta = {}
const meta: string = JSON.stringify(emptyMeta)

const state = {
  baseURL: COMMUNITIES_BASE_URL,
  initialized: false
}

async function resolveBaseURL(): Promise<string> {
  if (!state.initialized) {
    const { realmInfo } = await getRealm({})
    if (realmInfo?.realmName === LOCAL_PREVIEW_REALM_NAME) {
      state.baseURL = COMMUNITIES_TEST_BASE_URL
    }
    state.initialized = true
  }
  return state.baseURL
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
    throw new Error(`HTTP ${result.status}: ${result.statusText || result.body}`)
  }
  return JSON.parse(result.body)
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
    throw new Error(`HTTP ${result.status}: ${result.statusText || result.body}`)
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
    throw new Error(`HTTP ${result.status}: ${result.statusText || result.body}`)
  }
}

// --- Communities CRUD ---

export async function fetchCommunities(
  params: GetCommunitiesParams = {}
): Promise<PaginatedResponse<CommunityListItem>> {
  const base = await resolveBaseURL()
  const parts: string[] = []
  if (params.search != null) parts.push(`search=${encodeURIComponent(params.search)}`)
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

// --- Members ---

export async function fetchCommunityMembers(
  communityId: string,
  params: GetMembersParams = {}
): Promise<PaginatedResponse<CommunityMember>> {
  const base = await resolveBaseURL()
  const parts: string[] = []
  if (params.offset != null) parts.push(`offset=${params.offset}`)
  if (params.limit != null) parts.push(`limit=${params.limit}`)
  if (params.onlyOnline === true) parts.push('onlyOnline=true')
  const qs = parts.join('&')
  return await signedGet(
    `${base}/${communityId}/members${qs.length > 0 ? `?${qs}` : ''}`
  )
}
