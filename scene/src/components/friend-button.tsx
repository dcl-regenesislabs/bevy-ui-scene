import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { ButtonComponent } from './ui-system/button-component'
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
import {
  getFriendshipStateVersion,
  markSelfInitiatedFriendshipAction,
  notifyFriendshipStateChanged,
  pushBlockStatusToast
} from '../service/friend-connectivity-service'
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
  uiTransform,
  onPressed
}: {
  player?: GetPlayerDataRes
  userId?: string
  isFriend?: boolean
  hasIncomingRequest?: boolean
  hasOutgoingRequest?: boolean
  fontSize?: number
  uiTransform?: UiTransformProps
  /**
   * Fires when any action state of the button is pressed (accept,
   * cancel, unfriend, unblock — "Add Friend" already closes the host
   * popup itself). Hosts that should close on any action (profile
   * menu) pass their close function here.
   */
  onPressed?: () => void
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
  // 'blockedByMe' → offer "Unblock to Add Friend" (the user can undo their
  // own decision). 'blockedMe' → disabled generic button (don't disclose
  // who blocked whom; the backend rejects the request anyway).
  const [blockState, setBlockState] = useState<
    'none' | 'blockedByMe' | 'blockedMe'
  >('none')
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

  // Re-runs the friendship-state fetches whenever a sibling widget
  // (e.g. RejectFriendRequestButton in the same popup) completes a
  // friendship action — so "Accept Friend" flips to "Add Friend" right
  // after a reject without remounting the popup.
  const friendshipVersion = getFriendshipStateVersion()

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
  }, [friendshipVersion])

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
  }, [friendshipVersion])

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
  }, [friendshipVersion])

  // Re-derives on every friendship-state change. The block-update stream
  // (wired in friend-connectivity-service) bumps the version when someone
  // blocks/unblocks the local user, so an open profile flips live; our own
  // block/unblock actions bump it too.
  useEffect(() => {
    if (!getFeatureFlag(FEATURES.FRIENDS)) return
    if (userId === undefined) return
    executeTask(async () => {
      // Older explorer builds don't implement getBlockingStatus — the
      // BevyApi proxy resolves missing methods to undefined. Skip the
      // pre-check there; the send flow still surfaces the backend error.
      const status = await BevyApi.social.getBlockingStatus()
      if (status == null || !Array.isArray(status.blockedUsers)) return
      const target = userId.toLowerCase()
      if (status.blockedUsers.some((a) => a.toLowerCase() === target)) {
        setBlockState('blockedByMe')
      } else if (
        status.blockedByUsers.some((a) => a.toLowerCase() === target)
      ) {
        setBlockState('blockedMe')
      } else {
        // No block in either direction — reset (covers live unblock).
        setBlockState('none')
      }
    })
  }, [friendshipVersion])

  if (userId === undefined) return null

  // Guests cannot send / receive friend requests, so the button has no
  // meaningful state to expose.
  //   - opener is guest    → friendship actions require a wallet identity.
  //   - target is guest    → guest userIds are ephemeral, you can't be
  //                          friends with a session that won't exist next
  //                          login.
  // `getPlayer({ userId })` returns null for users not in the scene, so
  // the target check is best-effort: we hide when we can prove guest,
  // otherwise fall through.
  if (getPlayer()?.isGuest === true) return null
  if (playerProp?.isGuest === true || getPlayer({ userId })?.isGuest === true) {
    return null
  }

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

  // Blocking pre-checks (see blockState above). Friendship state is
  // irrelevant while a block exists in either direction — the backend
  // rejects every friendship action with BlockedUserError.
  if (blockState === 'blockedByMe') {
    return (
      <ButtonComponent
        variant="black"
        destructiveHover={true}
        value="<b>Unblock to Add Friend</b>"
        fontSize={fontSize}
        icon={{ atlasName: 'icons', spriteName: 'BlockUser' }}
        uiTransform={uiTransform}
        onMouseDown={() => {
          onPressed?.()
          showConfirmPopup({
            title: `Are you sure you want to unblock\n<b>${resolved.name}</b>?`,
            message:
              'If you unblock someone, you will see their avatar in-world, and you will be able to send friend requests and messages to each other in public or private chats.',
            icon: {
              spriteName: 'BlockUser',
              atlasName: 'icons',
              backgroundColor: COLOR.RED
            },
            confirmLabel: 'UNBLOCK',
            onConfirm: async () => {
              await BevyApi.social.unblockUser(resolved.userId)
              setBlockState('none')
              pushBlockStatusToast('unblocked', resolved.userId, resolved.name)
              notifyFriendshipStateChanged()
            }
          })
        }}
      />
    )
  }

  if (blockState === 'blockedMe') {
    // Deliberately generic: doesn't reveal that the target blocked the
    // local user, only that the action is unavailable.
    return (
      <ButtonComponent
        variant="black"
        disabled={true}
        value="<b>Can't Add This User</b>"
        fontSize={fontSize}
        icon={{ atlasName: 'context', spriteName: 'Add' }}
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
          onPressed?.()
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
              notifyFriendshipStateChanged()
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
          onPressed?.()
          executeTask(async () => {
            markSelfInitiatedFriendshipAction('accept', resolved.userId)
            await BevyApi.social.acceptFriendRequest(resolved.userId)
            // Optimistically update local state so the button flips to
            // the "Friend" branch on the next render without waiting for
            // a remount or external refetch.
            setIsFriendInternal(true)
            setHasIncomingRequestInternal(false)
            notifyFriendshipStateChanged()
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
          onPressed?.()
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
              notifyFriendshipStateChanged()
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
