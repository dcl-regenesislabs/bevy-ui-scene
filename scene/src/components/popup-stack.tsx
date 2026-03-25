import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { store } from '../state/store'
import { HUD_POPUP_TYPE, type HUDPopup } from '../state/hud/state'
import { PopupUrl } from '../ui-classes/main-hud/popup-url'
import { PassportPopup } from '../ui-classes/main-hud/passport/passport-popup'
import { NameEditPopup } from '../ui-classes/main-hud/passport/name-edit-popup'
import { AddProfileLinkPopup } from '../ui-classes/main-hud/passport/add-profile-link-popup'
import { ProfileMenuPopup } from '../ui-classes/main-hud/passport/profile-popup'
import { ErrorPopup } from '../ui-classes/main-hud/error-popup'
import { NotificationsMenu } from '../ui-classes/main-hud/notifications-menu'
import { PermissionRequestPopup } from '../ui-classes/main-hud/permissions-popups/permission-request-popup'
import { PopupTeleport } from '../ui-classes/main-hud/popup-teleport'
import { MAX_ZINDEX } from '../utils/constants'
import { PopupMarketplace } from '../ui-classes/main-hud/popup-marketplace'
import {
  FriendRequestReceivedPopup,
  FriendRequestSentPopup
} from './friends/friend-request-popup'
import { SendFriendRequestPopup } from './friends/send-friend-request-popup'
import { ConfirmUnfriendPopup } from './friends/confirm-unfriend-popup'

export type PopupParameters = { shownPopup: HUDPopup; key?: string }
export type Popup = (
  params: PopupParameters
) => ReactElement | null | ReactElement[]

const popupComponents: Record<number, Popup> = {
  [HUD_POPUP_TYPE.URL as number]: PopupUrl,
  [HUD_POPUP_TYPE.MARKETPLACE as number]: PopupMarketplace,
  [HUD_POPUP_TYPE.TELEPORT as number]: PopupTeleport, // TODO
  [HUD_POPUP_TYPE.PASSPORT as number]: PassportPopup,
  [HUD_POPUP_TYPE.NAME_EDIT as number]: NameEditPopup,
  [HUD_POPUP_TYPE.ADD_LINK as number]: AddProfileLinkPopup,
  [HUD_POPUP_TYPE.PROFILE_MENU as number]: ProfileMenuPopup,
  [HUD_POPUP_TYPE.ERROR as number]: ErrorPopup,
  [HUD_POPUP_TYPE.NOTIFICATIONS_MENU as number]: NotificationsMenu,
  [HUD_POPUP_TYPE.PERMISSION_REQUEST as number]: PermissionRequestPopup,
  [HUD_POPUP_TYPE.FRIEND_REQUEST_RECEIVED as number]:
    FriendRequestReceivedPopup,
  [HUD_POPUP_TYPE.FRIEND_REQUEST_SENT as number]: FriendRequestSentPopup,
  [HUD_POPUP_TYPE.SEND_FRIEND_REQUEST as number]: SendFriendRequestPopup,
  [HUD_POPUP_TYPE.CONFIRM_UNFRIEND as number]: ConfirmUnfriendPopup
}

export function PopupStack(): ReactElement | null {
  const shownPopups = store.getState().hud.shownPopups
  if (!shownPopups.length) return null
  return (
    <UiEntity
      uiTransform={{ zIndex: MAX_ZINDEX - 1, width: '100%', height: '100%' }}
    >
      {shownPopups.map(
        (shownPopup: HUDPopup, index) =>
          popupComponents[shownPopup.type]({
            shownPopup,
            key: `${shownPopup.type}-${index}`
          }) as ReactElement
      )}
    </UiEntity>
  )
}
