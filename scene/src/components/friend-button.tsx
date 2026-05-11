import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
import { ButtonComponent } from './button-component'
import { getFontSize } from '../service/fontsize-system'
import { useLayoutContext } from '../service/layout-context'
import { type GetPlayerDataRes } from '../utils/definitions'
import {
  resolvePlayerData,
  type ResolvedPlayerData
} from '../utils/passport-promise-utils'
import { BevyApi } from '../bevy-api'
import { store } from '../state/store'
import { closeLastPopupAction, pushPopupAction } from '../state/hud/actions'
import { HUD_POPUP_TYPE } from '../state/hud/state'
import { showConfirmPopup } from './confirm-popup'
import { COLOR } from './color-palette'
import { FEATURES, getFeatureFlag } from '../service/feature-flags'
import { markSelfInitiatedFriendshipAction } from '../service/friend-connectivity-service'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

/**
 * Friend / Add Friend toggle button.
 *
 * Pass either `player` (preferred) or `userId`. The display name is
 * resolved via `resolvePlayerData` (sync `getPlayer` first, falls back
 * to the catalyst lambda for users not in the scene). `isFriend` and
 * `hasIncomingRequest` are resolved on mount unless the props are given.
 *
 * Visual variant is fixed per state — no prop to override:
 *   - friend, idle  → `black` ("Friend" + FriendIcon).
 *   - friend, hover → `black` + red border ("Remove Friend" + Unfriends).
 *   - incoming request pending → `primary` CTA ("Accept Friend").
 *   - outgoing request pending, idle  → `black` ("Request Sent").
 *   - outgoing request pending, hover → `black` + red border ("Cancel Request").
 *   - add friend    → `primary` CTA ("Add Friend" + Add).
 *   - loading       → `black` placeholder with pulsing opacity.
 */
export function FriendButton({
  player: playerProp,
  userId: userIdProp,
  isFriend: isFriendProp,
  hasIncomingRequest: hasIncomingRequestProp,
  hasOutgoingRequest: hasOutgoingRequestProp,
  fontSize: fontSizeProp,
  uiTransform
}: {
  player?: GetPlayerDataRes
  userId?: string
  isFriend?: boolean
  hasIncomingRequest?: boolean
  hasOutgoingRequest?: boolean
  fontSize?: number
  uiTransform?: UiTransformProps
}): ReactElement | null {
  const layoutContext = useLayoutContext()
  const fontSize = fontSizeProp ?? getFontSize({ context: layoutContext })

  const userId = playerProp?.userId ?? userIdProp

  // If `playerProp` is given, derive the resolved data synchronously and
  // skip the async fetch + loading state entirely. Otherwise we start
  // with `null` and let the useEffect below fetch it.
  const seededFromPlayer: ResolvedPlayerData | null =
    playerProp != null
      ? {
          userId: playerProp.userId,
          name: playerProp.name,
          hasClaimedName: !!(
            playerProp.name?.length && !playerProp.name?.includes('#')
          )
        }
      : null
  const [resolved, setResolved] = useState<ResolvedPlayerData | null>(
    () => seededFromPlayer
  )
  const [isFriendInternal, setIsFriendInternal] = useState<boolean>(false)
  const [hasIncomingRequestInternal, setHasIncomingRequestInternal] =
    useState<boolean>(false)
  const [hasOutgoingRequestInternal, setHasOutgoingRequestInternal] =
    useState<boolean>(false)
  const [hovered, setHovered] = useState<boolean>(false)
  const isFriend = isFriendProp ?? isFriendInternal
  const hasIncomingRequest =
    hasIncomingRequestProp ?? hasIncomingRequestInternal
  const hasOutgoingRequest =
    hasOutgoingRequestProp ?? hasOutgoingRequestInternal

  useEffect(() => {
    if (seededFromPlayer !== null) return
    if (userId === undefined) return
    executeTask(async () => {
      setResolved(await resolvePlayerData(userId))
    })
  }, [])

  useEffect(() => {
    if (isFriendProp !== undefined) return
    if (!getFeatureFlag(FEATURES.FRIENDS)) return
    if (userId === undefined) return
    executeTask(async () => {
      const friends = await BevyApi.social.getFriends()
      setIsFriendInternal(
        friends.some((f) => f.address.toLowerCase() === userId.toLowerCase())
      )
    })
  }, [])

  useEffect(() => {
    if (hasIncomingRequestProp !== undefined) return
    if (!getFeatureFlag(FEATURES.FRIENDS)) return
    if (userId === undefined) return
    executeTask(async () => {
      const requests = await BevyApi.social.getReceivedFriendRequests()
      setHasIncomingRequestInternal(
        requests.some((r) => r.address.toLowerCase() === userId.toLowerCase())
      )
    })
  }, [])

  useEffect(() => {
    if (hasOutgoingRequestProp !== undefined) return
    if (!getFeatureFlag(FEATURES.FRIENDS)) return
    if (userId === undefined) return
    executeTask(async () => {
      const requests = await BevyApi.social.getSentFriendRequests()
      setHasOutgoingRequestInternal(
        requests.some((r) => r.address.toLowerCase() === userId.toLowerCase())
      )
    })
  }, [])

  if (userId === undefined) return null

  // Loading placeholder while we resolve the player's name asynchronously.
  if (resolved === null) {
    return (
      <ButtonComponent
        variant="black"
        value="<b>...</b>"
        fontSize={fontSize}
        icon={{ atlasName: 'icons', spriteName: 'FriendIcon' }}
        loading={true}
        uiTransform={uiTransform}
        onMouseDown={() => {}}
      />
    )
  }

  if (isFriend) {
    return (
      <ButtonComponent
        variant="black"
        destructiveHover={true}
        value={hovered ? '<b>Remove Friend</b>' : '<b>Friend</b>'}
        fontSize={fontSize}
        icon={{
          atlasName: hovered ? 'context' : 'icons',
          spriteName: hovered ? 'Unfriends' : 'FriendIcon'
        }}
        uiTransform={uiTransform}
        onMouseEnter={() => {
          setHovered(true)
        }}
        onMouseLeave={() => {
          setHovered(false)
        }}
        onMouseDown={() => {
          showConfirmPopup({
            title: `Are you sure you want to unfriend <b>${resolved.name}</b>?`,
            icon: {
              spriteName: 'Unfriends',
              atlasName: 'context',
              backgroundColor: COLOR.RED
            },
            confirmLabel: 'UNFRIEND',
            category: 'friendship',
            address: resolved.userId,
            onConfirm: async () => {
              await BevyApi.social.deleteFriend(resolved.userId)
            }
          })
        }}
      />
    )
  }

  if (hasIncomingRequest) {
    return (
      <ButtonComponent
        variant="primary"
        value="<b>Accept Friend</b>"
        fontSize={fontSize}
        icon={{ atlasName: 'icons', spriteName: 'Check' }}
        uiTransform={uiTransform}
        onMouseDown={() => {
          executeTask(async () => {
            markSelfInitiatedFriendshipAction('accept', resolved.userId)
            await BevyApi.social.acceptFriendRequest(resolved.userId)
            // Optimistically update local state so the button flips to
            // the "Friend" branch on the next render without waiting for
            // a remount or external refetch.
            setIsFriendInternal(true)
            setHasIncomingRequestInternal(false)
          })
        }}
      />
    )
  }

  if (hasOutgoingRequest) {
    return (
      <ButtonComponent
        variant="black"
        destructiveHover={true}
        value={hovered ? '<b>Cancel Request</b>' : '<b>Request Sent</b>'}
        fontSize={fontSize}
        icon={{
          atlasName: hovered ? 'icons' : 'context',
          spriteName: hovered ? 'CloseIcon' : 'Add'
        }}
        uiTransform={uiTransform}
        onMouseEnter={() => {
          setHovered(true)
        }}
        onMouseLeave={() => {
          setHovered(false)
        }}
        onMouseDown={() => {
          showConfirmPopup({
            title: `Cancel friend request to <b>${resolved.name}</b>?`,
            icon: {
              spriteName: 'CloseIcon',
              atlasName: 'icons',
              backgroundColor: COLOR.BUTTON_PRIMARY
            },
            confirmLabel: 'CANCEL REQUEST',
            cancelLabel: 'BACK',
            category: 'friendship',
            address: resolved.userId,
            onConfirm: async () => {
              markSelfInitiatedFriendshipAction('cancel', resolved.userId)
              await BevyApi.social.cancelFriendRequest(resolved.userId)
              // Optimistic flip back to "Add Friend".
              setHasOutgoingRequestInternal(false)
            }
          })
        }}
      />
    )
  }

  return (
    <ButtonComponent
      variant="primary"
      value="<b>Add Friend</b>"
      fontSize={fontSize}
      icon={{ atlasName: 'context', spriteName: 'Add' }}
      uiTransform={uiTransform}
      onMouseDown={() => {
        // Close the parent popup (passport / profile-popup) that hosted
        // this button. The SEND_FRIEND_REQUEST popup is a self-contained
        // flow — once the user is in it, the underlying popup is just
        // visual noise and would still be there after the request is sent
        // showing a stale "Add Friend" button.
        store.dispatch(closeLastPopupAction())
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.SEND_FRIEND_REQUEST,
            data: {
              address: resolved.userId,
              name: resolved.name,
              hasClaimedName: resolved.hasClaimedName,
              profilePictureUrl: ''
            }
          })
        )
      }}
    />
  )
}
