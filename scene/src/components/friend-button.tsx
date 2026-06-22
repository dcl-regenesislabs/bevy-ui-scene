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
  getRelationshipStatus,
  isRelationshipReady,
  markSelfInitiatedFriendshipAction,
  pushBlockStatusToast,
  withOptimisticStatus
} from '../service/friend-connectivity-service'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

/**
 * Friend / Add Friend toggle button.
 *
 * Pass either `player` (preferred) or `userId`. The display name is resolved
 * via `resolvePlayerData` (sync `getPlayer` first, falls back to the catalyst
 * lambda). The **friendship state is read from the single source of truth**
 * (`getRelationshipStatus`, backed by `friend-connectivity-service`), so the
 * button needs no per-instance fetches and every button on screen reflects any
 * change on the next frame.
 *
 * Visual variant is fixed per state — no prop to override:
 *   - my block        → `black` ("Unblock to Add Friend").
 *   - blocked by them  → disabled `black` ("Can't Add This User").
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
  fontSize: fontSizeProp,
  uiTransform,
  onPressed
}: {
  player?: GetPlayerDataRes
  userId?: string
  fontSize?: number
  uiTransform?: UiTransformProps
  /**
   * Fires when any action state of the button is pressed (accept, cancel,
   * unfriend, unblock — "Add Friend" already closes the host popup itself).
   * Hosts that should close on any action (profile menu) pass their close
   * function here.
   */
  onPressed?: () => void
}): ReactElement | null {
  const layoutContext = useLayoutContext()
  const fontSize = fontSizeProp ?? getFontSize({ context: layoutContext })

  const userId = playerProp?.userId ?? userIdProp

  // If `playerProp` is given, derive the resolved data synchronously and skip
  // the async fetch + loading state entirely. Otherwise we start with `null`
  // and let the useEffect below fetch it.
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
  const [hovered, setHovered] = useState<boolean>(false)

  useEffect(() => {
    if (seededFromPlayer !== null) return
    if (userId === undefined) return
    executeTask(async () => {
      setResolved(await resolvePlayerData(userId))
    })
  }, [])

  if (userId === undefined) return null

  // Guests cannot send / receive friend requests, so the button has no
  // meaningful state to expose.
  if (getPlayer()?.isGuest === true) return null
  if (playerProp?.isGuest === true || getPlayer({ userId })?.isGuest === true) {
    return null
  }

  const friendsEnabled = getFeatureFlag(FEATURES.FRIENDS)

  // Loading placeholder while we resolve the player's name, or while the
  // relationship snapshot hasn't been seeded yet (avoids a wrong-state flash).
  if (resolved === null || (friendsEnabled && !isRelationshipReady())) {
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

  const status = friendsEnabled ? getRelationshipStatus(userId) : 'none'

  // Blocking pre-checks. Friendship state is irrelevant while a block exists in
  // either direction — the backend rejects every friendship action.
  if (status === 'blockedByMe') {
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
              await withOptimisticStatus(resolved.userId, 'none', async () => {
                await BevyApi.social.unblockUser(resolved.userId)
              })
              pushBlockStatusToast('unblocked', resolved.userId, resolved.name)
            }
          })
        }}
      />
    )
  }

  if (status === 'blockedMe') {
    // Deliberately generic: doesn't reveal that the target blocked the local
    // user, only that the action is unavailable.
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

  if (status === 'friend') {
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
              await withOptimisticStatus(resolved.userId, 'none', async () => {
                await BevyApi.social.deleteFriend(resolved.userId)
              })
            }
          })
        }}
      />
    )
  }

  if (status === 'incoming') {
    return (
      <ButtonComponent
        variant="primary"
        value="<b>Accept Friend</b>"
        fontSize={fontSize}
        icon={{ atlasName: 'icons', spriteName: 'Check' }}
        uiTransform={uiTransform}
        onMouseDown={() => {
          onPressed?.()
          markSelfInitiatedFriendshipAction('accept', resolved.userId)
          executeTask(async () => {
            await withOptimisticStatus(resolved.userId, 'friend', async () => {
              await BevyApi.social.acceptFriendRequest(resolved.userId)
            })
          })
        }}
      />
    )
  }

  if (status === 'outgoing') {
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
              await withOptimisticStatus(resolved.userId, 'none', async () => {
                await BevyApi.social.cancelFriendRequest(resolved.userId)
              })
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
        // Close the parent popup (passport / profile-popup) that hosted this
        // button. The SEND_FRIEND_REQUEST popup is a self-contained flow.
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
