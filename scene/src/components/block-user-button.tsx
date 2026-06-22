import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import {
  ButtonComponent,
  type ButtonVariant
} from './ui-system/button-component'
import { COLOR } from './color-palette'
import { getFontSize } from '../service/fontsize-system'
import { useLayoutContext } from '../service/layout-context'
import { type GetPlayerDataRes } from '../utils/definitions'
import {
  resolvePlayerData,
  type ResolvedPlayerData
} from '../utils/passport-promise-utils'
import { BevyApi } from '../bevy-api'
import { showConfirmPopup } from './confirm-popup'
import { FEATURES, getFeatureFlag } from '../service/feature-flags'
import {
  getRelationshipStatus,
  isRelationshipReady,
  pushBlockStatusToast,
  withOptimisticStatus
} from '../service/friend-connectivity-service'

import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

/**
 * Block / Unblock user toggle button.
 *
 * Pass either `player` (preferred) or `userId`. Display name is resolved
 * via `resolvePlayerData` (sync `getPlayer`, fallback to catalyst lambda).
 * `isBlocked` is resolved via `BevyApi.social.getBlockedUsers()` on mount
 * unless the prop is provided.
 *
 * Visual states:
 *   - not blocked → `destructive` variant ("Block User"). Click opens
 *                   the block confirm popup.
 *   - blocked, idle → `subtle` variant ("BLOCKED").
 *   - blocked, hover → `destructive` variant ("UNBLOCK"). Click opens
 *                      the unblock confirm popup.
 */
export function BlockUserButton({
  player: playerProp,
  userId: userIdProp,
  fontSize: fontSizeProp,
  variant = 'subtle',
  uiTransform,
  onPressed
}: {
  player?: GetPlayerDataRes
  userId?: string
  fontSize?: number
  /**
   * Variant used by the non-CTA states (BLOCKED idle / loading). The
   * "Block User" CTA stays `transparent` and the "UNBLOCK" hover state
   * gets its red border via `destructiveHover`. Default `'subtle'`.
   */
  variant?: ButtonVariant
  uiTransform?: UiTransformProps
  /**
   * Fires when the button is pressed, before the confirm popup opens.
   * Hosts that should close on any action (profile menu) pass their
   * close function here.
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
  const [hovered, setHovered] = useState<boolean>(false)

  useEffect(() => {
    if (seededFromPlayer !== null) return
    if (userId === undefined) return
    executeTask(async () => {
      setResolved(await resolvePlayerData(userId))
    })
  }, [])

  if (userId === undefined) return null

  // Guests have no persistent identity, so blocking has no effect: their
  // address resets next session. Hide the button entirely when the local
  // user is a guest.
  if (getPlayer()?.isGuest === true) return null

  const friendsEnabled = getFeatureFlag(FEATURES.FRIENDS)
  // Block state comes from the single source of truth.
  const isBlocked =
    friendsEnabled && isRelationshipReady()
      ? getRelationshipStatus(userId) === 'blockedByMe'
      : false

  // Loading placeholder while we resolve the name or seed the relationship state.
  if (resolved === null || (friendsEnabled && !isRelationshipReady())) {
    return (
      <ButtonComponent
        variant={variant}
        value="<b>...</b>"
        fontSize={fontSize}
        icon={{ atlasName: 'icons', spriteName: 'BlockUser' }}
        loading={true}
        uiTransform={uiTransform}
        onMouseDown={() => {}}
      />
    )
  }

  if (isBlocked) {
    return (
      <ButtonComponent
        key={'block-user-button-' + resolved.userId}
        variant={variant}
        destructiveHover={true}
        value={hovered ? '<b>UNBLOCK</b>' : '<b>BLOCKED</b>'}
        fontSize={fontSize}
        icon={{ atlasName: 'icons', spriteName: 'BlockUser' }}
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

  return (
    <ButtonComponent
      key={'block-user-button-' + resolved.userId}
      variant={variant}
      destructiveHover={true}
      value="<b>Block User</b>"
      fontSize={fontSize}
      icon={{ atlasName: 'icons', spriteName: 'BlockUser' }}
      uiTransform={uiTransform}
      onMouseDown={() => {
        onPressed?.()
        showConfirmPopup({
          title: `Are you sure you want to block\n<b>${resolved.name}</b>?`,
          message:
            "If you block someone in Decentraland, you will no longer see their avatar in-world, and you will not be able to send friend requests or messages to each other. You will also not see each other's names or messages in public chats.",
          icon: {
            spriteName: 'BlockUser',
            atlasName: 'icons',
            backgroundColor: COLOR.RED
          },
          confirmLabel: 'BLOCK',
          onConfirm: async () => {
            await withOptimisticStatus(
              resolved.userId,
              'blockedByMe',
              async () => {
                await BevyApi.social.blockUser(resolved.userId)
              }
            )
            pushBlockStatusToast('blocked', resolved.userId, resolved.name)
          }
        })
      }}
    />
  )
}
