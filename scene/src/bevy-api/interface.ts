import type { Vector2 } from '@dcl/sdk/math'
import type { URN, URNWithoutTokenId } from '../utils/definitions'
import { type WearableCategory } from '../service/categories'
import { type ChatMessageDefinition } from '../components/chat-message/ChatMessage.types'
import { type ProfileExtra } from '../utils/passport-promise-utils'
import {
  type GetPermanentPermissionsArgs,
  type PermanentPermissionItem,
  type PermissionRequest,
  type PermissionUsed,
  type SetPermanentPermissionArgs,
  type SetSinglePermissionArgs
} from './permission-definitions'
import { type PBPointerEvents_Entry } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/pointer_events.gen'
import { InputAction, PointerEventType } from '@dcl/ecs'

export type ExplorerSetting = {
  name: string
  category: string
  description: string
  minValue: number
  maxValue: number
  namedVariants: [{ name: string; description: string }]
  value: number
  default: number
  stepSize: number
}

export type SignedFetchMetaRealm = {
  hostname: string
  protocol: string
  server_name: string
}
export type SignedFetchMeta = {
  origin?: string
  scene_id?: string
  parcel?: string
  tld?: string
  network?: string
  is_guest?: boolean
  realm?: SignedFetchMetaRealm
  signer?: string
}
export type JsonStringified<T> = string & { __jsonBrand: T } // TODO
export type SignedFetchMetaJson = JsonStringified<SignedFetchMeta>

export type KernelFetch = {
  url: string
  init?: {
    method: 'PATCH' | 'POST' | 'GET' | 'DELETE' | 'PUT'
    headers: Record<string, string>
    body?: string
  }
  meta?: string
}

export type KernelFetchRespose = {
  ok: boolean
  status: number
  statusText: string
  headers: Array<Record<string, string>>
  body: string
}

type PBAvatarEquippedData = {
  wearableUrns: URN[]
  emoteUrns: URN[]
  forceRender: WearableCategory[]
}
export type RGBColor = { r: number; g: number; b: number }
export type RGBAColor = { r: number; g: number; b: number; a: number }
export type PBAvatarBase = {
  name: string
  skinColor?: RGBColor
  eyesColor?: RGBColor
  hairColor?: RGBColor
  bodyShapeUrn: URNWithoutTokenId
}

export type SetAvatarData = {
  base?: PBAvatarBase
  equip?: PBAvatarEquippedData
  hasClaimedName?: boolean
  profileExtras?: ProfileExtra
}

export type LiveSceneInfo = {
  hash: string
  base_url?: string
  title: string
  parcels: Vector2[]
  isPortable: boolean
  isBroken: boolean
  isBlocked: boolean
  isSuper: boolean
  sdkVersion: string
}

export type HomeScene = {
  realm: string
  parcel: Vector2
}

export type InputBinding =
  | `Key${string}`
  | `Digit${string}`
  | `Mouse${string}`
  | `Gamepad${string}`
  | `Arrow${string}`
  | `Numpad${string}`
  | `Shift${string}`
  | 'Space'
  | 'Tab'
  | 'Enter'
  | 'Escape'
  | 'PageUp'
  | 'PageDown'

export type SystemAction = {
  action: string
  pressed: boolean
  toString: string
}

export enum HoverTargetType {
  WORLD,
  UI,
  AVATAR
}

export type SystemHoverEvent = {
  entered: boolean
  targetType: HoverTargetType
  actions: Array<PBPointerEvents_Entry & { enabled: boolean }>
}

export type ShowUiRequestParams = {
  hash?: string | undefined
  show?: boolean | undefined
}

export type MicActivation = {
  sender_address: string
  active: boolean
}

export type Action = { Scene: string } | { System: string }

export type Binding = [Action, InputBinding[]]

export type BindingsConfig = {
  bindings: Binding[]
}
export type BevyApiInterface = {
  setAvatar: (avatarData: SetAvatarData) => Promise<number>
  openSceneLogger: () => Promise<void>
  checkForUpdate: () => Promise<{ description: string; url: string }>
  messageOfTheDay: () => Promise<{ message: string }>
  getPreviousLogin: () => Promise<{ userId: string }>
  loginPrevious: () => Promise<{ success: boolean; error: string }>
  loginNew: () => {
    code: Promise<number>
    success: Promise<void>
  }
  loginCancel: () => void
  loginGuest: () => void
  logout: () => void

  getSettings: () => Promise<ExplorerSetting[]>
  setSetting: (name: string, value: number) => Promise<void>
  kernelFetch: (requestBody: KernelFetch) => Promise<KernelFetchRespose>

  reload: (hash: string | undefined) => Promise<void>
  showUi: (showUiRequestParams: ShowUiRequestParams) => Promise<boolean>
  liveSceneInfo: () => Promise<LiveSceneInfo[]>
  getHomeScene: () => Promise<HomeScene>
  setHomeScene: (home: HomeScene) => void
  getRealmProvider: () => Promise<string>
  getSystemActionStream: () => Promise<SystemAction[]>
  getHoverStream: () => Promise<SystemHoverEvent[]>
  getInputBindings: () => Promise<BindingsConfig>
  getChatStream: () => Promise<ChatMessageDefinition[]>
  getVoiceStream: () => Promise<MicActivation[]>
  sendChat: (message: string, channel?: string) => void
  quit: () => void
  getPermissionRequestStream: () => Promise<PermissionRequest[]>
  getPermissionUsedStream: () => Promise<PermissionUsed[]>
  setSinglePermission: (arg0: SetSinglePermissionArgs) => void
  getPermanentPermissions: (
    arg0: GetPermanentPermissionsArgs
  ) => Promise<PermanentPermissionItem[]>
  setPermanentPermission: (arg0: SetPermanentPermissionArgs) => void
  getPermissionTypes: any
  setInteractableArea: ({
    top,
    left,
    bottom,
    right
  }: {
    top: number
    left: number
    right: number
    bottom: number
  }) => void
  setMicEnabled: (enabled: boolean) => void
  getMicState: () => Promise<{ enabled: boolean; available: boolean }>
}

// system api module

// const { op_check_for_update, op_motd, op_get_current_login, op_get_previous_login, op_login_previous, op_login_new_code, op_login_new_success, op_login_cancel, op_login_guest, op_logout } = Deno.core.ops;

// // (description: option<string>, url: option<string>)
// module.exports.checkForUpdate = async function() {
//     let (description, url) = await op_check_for_update();
//     return {
//         description,
//         url
//     }
// }

// // (message: string)
// module.exports.messageOfTheDay = async function() {
//     return {
//         message: await op_motd()
//     }
// }

// // (currentLogin: option<string>)
// module.exports.getCurrentLogin = function() {
//     return {
//         current_login: op_get_current_login()
//     }
// }

// // (userId: option<string>)
// module.exports.getPreviousLogin = async function() {
//     return {
//         userId: await op_get_previous_login()
//     }
// }

// // (success: bool, error: option<string>)
// module.exports.loginPrevious = async function() {
//     return await op_login_previous()
// }

// // (code: Promise<option<string>>, success: Promise<(success: bool, error: option<string>)>)
// module.exports.loginNew = function() {
//     return {
//         code: op_login_new_code(),
//         success: op_login_new_success(),
//     }
// }

// // nothing
// module.exports.loginGuest = function() {
//     op_login_guest()
// }

// // nothing
// module.exports.loginCancel = function() {
//     op_login_cancel()
// }

// // nothing
// module.exports.logout = function() {
//     op_logout()
// }
