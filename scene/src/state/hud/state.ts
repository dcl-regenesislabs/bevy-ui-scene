import { cloneDeep } from '../../utils/function-utils'
import { type NameDefinition } from '../../utils/passport-promise-utils'
import { type Place } from '../../service/map-places'
import { Vector3 } from '@dcl/sdk/math'
import { type SceneLoadingWindow } from '../../bevy-api/interface'
import {
  loadMinimapStyle,
  loadMinimapRotation,
  loadBigMapStyle,
  loadBigMap2DLayer,
  loadMinimapMarkerCategories,
  loadMinimapZoom
} from '../../components/map/mini-map-persistence'
import { categories as ALL_PLACE_CATEGORIES } from '../../components/map/map-definitions'
import type {
  BigMapStyle,
  BigMap2DLayer
} from '../../components/map/mini-map-persistence'
import {
  type AchievedAchievementItem,
  type NotAchievedAchievementItem
} from '../../ui-classes/main-hud/passport/badges-types'
import { PASSPORT_SECTIONS } from '../../ui-classes/main-hud/passport/passport-constants'
import type {
  FriendRequestData,
  FriendStatusData
} from '../../service/social-service-type'

export const HUD_STORE_ID = 'hud'

export type ViewAvatarData = Record<string, any> & {
  hasClaimedName: boolean
  hasConnectedWeb3: boolean
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
  name: string
  links: Array<{ url: string; title: string }>
  userId: string
}

export const EMPTY_PROFILE_DATA = {
  userId: '',
  hasClaimedName: false,
  hasConnectedWeb3: false,
  name: 'Bevy_User',
  description: '',
  country: '',
  language: '',
  gender: '',
  relationshipStatus: '',
  sexualOrientation: '',
  employmentStatus: '',
  pronouns: '',
  profession: '',
  birthdate: 0,
  hobbies: '',
  links: []
}

export enum HUD_POPUP_TYPE {
  URL,
  MARKETPLACE,
  TELEPORT,
  PASSPORT,
  NAME_EDIT,
  ADD_LINK,
  PROFILE_MENU,
  ERROR,
  NOTIFICATIONS_MENU,
  PERMISSION_REQUEST,
  FRIEND_REQUEST_RECEIVED,
  FRIEND_REQUEST_SENT,
  SEND_FRIEND_REQUEST,
  FRIENDSHIP_RESULT,
  COMMUNITY_VIEW,
  COMMUNITY_PLACE_INFO,
  COMMUNITY_EVENT_INFO,
  CREATE_COMMUNITY,
  CONFIRM_DELETE_COMMUNITY,
  CONFIRM,
  COMMUNITY_MEMBER_MENU,
  ALERT
}

export type HUDPopup = {
  type: HUD_POPUP_TYPE
  data?: unknown
}
export type SceneCatalogOrder =
  | 'most_active'
  | 'like_score'
  | 'updated_at'
  | 'created_at'
export type HudState = {
  mapCameraIsOrbiting: boolean
  transitioningToMap: boolean
  chatOpen: boolean
  shownPopups: HUDPopup[]
  profileData: ViewAvatarData
  names: NameDefinition[]
  unreadNotifications: number
  loggedIn: boolean
  realmURL?: string
  chatOptionShowUserMessages: boolean
  chatOptionShowSystemMessages: boolean
  chatInput: string
  minimapOpen: boolean
  mapModeActive: boolean
  mapFilterCategories: string[]
  placeListActiveItem: Place | null
  sceneList: {
    total: number
    data: Place[]
  }
  movingMap: boolean
  sceneCatalogOrder: SceneCatalogOrder
  homePlace: Place | null
  mapTargetPosition: Vector3
  placeType: 'places' | 'worlds'
  chatInputMentionSuggestions: string[]
  chatInputEmojiSuggestions: string[]
  playerVoiceStateMap: Record<string, boolean>
  micEnabled: boolean
  loadingScene: SceneLoadingWindow
  passportSelectedBadge:
    | AchievedAchievementItem
    | NotAchievedAchievementItem
    | null
  passportActiveSection: (typeof PASSPORT_SECTIONS)[number]
  friendsOpen: boolean
  friendsActiveTabIndex: number
  sentFriendRequests: FriendRequestData[]
  receivedFriendRequests: FriendRequestData[]
  friends: FriendStatusData[]
  friendsLoading: boolean
  /** Addresses I have blocked. */
  blockedUsers: string[]
  /** Addresses that have blocked me (empty on builds without getBlockingStatus). */
  blockedByUsers: string[]
  /** True once the relationship snapshot (friends/requests/blocks) is seeded. */
  relationshipReady: boolean
  /** Pending community invites + requests sent + requests received (HUD badge). */
  pendingCommunityRequests: number
  minimapStyle: 'parcel' | 'satellite' | 'imposters'
  minimapRotation: 'camera' | 'north'
  minimapMarkerCategories: string[]
  minimapZoom: number
  bigMapStyle: BigMapStyle
  bigMap2DLayer: BigMap2DLayer
  bigMap2DPendingCenter: { x: number; z: number; ts: number } | null
}

export type HudStateUpdateParams = {
  transitioningToMap?: boolean
  chatOpen?: boolean
  shownPopup?: HUDPopup[]
  profileData?: ViewAvatarData
  names?: NameDefinition[]
  loggedIn?: boolean
  unreadNotifications?: number
  realmURL?: string
  chatOptionShowUserMessages?: boolean
  chatOptionShowSystemMessages?: boolean
  chatInput?: string
  minimapOpen?: boolean
  mapModeActive?: boolean
  mapFilterCategories?: string[]
  placeListActiveItem?: Place | null
  sceneList?: {
    total: number
    data: Place[]
  }
  movingMap?: boolean
  sceneCatalogOrder?: SceneCatalogOrder
  homePlace?: Place
  mapTargetPosition?: Vector3
  mapCameraIsOrbiting?: boolean
  placeType?: 'places' | 'worlds'
  chatInputMentionSuggestions?: string[]
  chatInputEmojiSuggestions?: string[]
  playerVoiceStateMap?: Record<string, boolean>
  micEnabled?: boolean
  loadingScene?: SceneLoadingWindow
  passportSelectedBadge?:
    | AchievedAchievementItem
    | NotAchievedAchievementItem
    | null
  passportActiveSection?: (typeof PASSPORT_SECTIONS)[number]
  friendsOpen?: boolean
  friendsActiveTabIndex?: number
  sentFriendRequests?: FriendRequestData[]
  receivedFriendRequests?: FriendRequestData[]
  friends?: FriendStatusData[]
  friendsLoading?: boolean
  blockedUsers?: string[]
  blockedByUsers?: string[]
  relationshipReady?: boolean
  pendingCommunityRequests?: number
  minimapStyle?: 'parcel' | 'satellite' | 'imposters'
  minimapRotation?: 'camera' | 'north'
  minimapMarkerCategories?: string[]
  minimapZoom?: number
  bigMapStyle?: BigMapStyle
  bigMap2DLayer?: BigMap2DLayer
  bigMap2DPendingCenter?: { x: number; z: number; ts: number } | null
}

export const hudInitialState: HudState = {
  transitioningToMap: false,
  chatOpen: true,
  shownPopups: [],
  profileData: cloneDeep(EMPTY_PROFILE_DATA),
  names: [],
  loggedIn: false,
  unreadNotifications: 0,
  realmURL: 'main',
  chatOptionShowUserMessages: true,
  chatOptionShowSystemMessages: false,
  chatInput: '',
  minimapOpen: true,
  mapModeActive: false,
  mapFilterCategories: ['all'],
  placeListActiveItem: null,
  sceneList: {
    total: 0,
    data: []
  },
  movingMap: true,
  sceneCatalogOrder: `most_active`,
  homePlace: null,
  mapTargetPosition: Vector3.Zero(),
  mapCameraIsOrbiting: false,
  placeType: 'places',
  chatInputMentionSuggestions: [],
  chatInputEmojiSuggestions: [],
  playerVoiceStateMap: {},
  micEnabled: false,
  loadingScene: {
    visible: false,
    realmConnected: true,
    title: '',
    pendingAssets: null
  },
  passportSelectedBadge: null,
  passportActiveSection: PASSPORT_SECTIONS[0],
  friendsOpen: false,
  friendsActiveTabIndex: 0,
  sentFriendRequests: [],
  receivedFriendRequests: [],
  friends: [],
  friendsLoading: true,
  blockedUsers: [],
  blockedByUsers: [],
  relationshipReady: false,
  pendingCommunityRequests: 0,
  minimapStyle: loadMinimapStyle(),
  minimapRotation: loadMinimapRotation(),
  minimapMarkerCategories: loadMinimapMarkerCategories(
    ALL_PLACE_CATEGORIES.map((c) => c.name)
  ),
  minimapZoom: loadMinimapZoom(256),
  bigMapStyle: loadBigMapStyle(),
  bigMap2DLayer: loadBigMap2DLayer(),
  bigMap2DPendingCenter: null
}
