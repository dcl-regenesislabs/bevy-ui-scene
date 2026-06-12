import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
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
  getFriendshipStateVersion,
  markSelfInitiatedFriendshipAction,
  notifyFriendshipStateChanged
} from '../service/friend-connectivity-service'

import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

/**
 * "Reject Friend Request" menu item. Renders ONLY while there is a
 * pending incoming friend request from the given user — otherwise null.
 *
 * Pass either `player` (preferred) or `userId`. Same confirm flow as the
 * reject action in the friend-requests panel (friend-request-item.tsx),
 * so rejecting from a profile/passport behaves identically.
 */
export function RejectFriendRequestButton({
  player: playerProp,
  userId: userIdProp,
  variant = 'subtle',
  fontSize: fontSizeProp,
  uiTransform,
  onPressed
}: {
  player?: GetPlayerDataRes
  userId?: string
  variant?: ButtonVariant
  fontSize?: number
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
  const [hasIncomingRequest, setHasIncomingRequest] = useState<boolean>(false)

  useEffect(() => {
    if (seededFromPlayer !== null) return
    if (userId === undefined) return
    executeTask(async () => {
      setResolved(await resolvePlayerData(userId))
    })
  }, [])

  // Re-checks on every friendship-state change (remote request arriving,
  // accept from the sibling FriendButton, …) so the item appears or
  // disappears live while the popup stays open.
  const friendshipVersion = getFriendshipStateVersion()

  useEffect(() => {
    if (!getFeatureFlag(FEATURES.FRIENDS)) return
    if (userId === undefined) return
    executeTask(async () => {
      const requests = await BevyApi.social.getReceivedFriendRequests()
      setHasIncomingRequest(
        requests.some((r) => r.address.toLowerCase() === userId.toLowerCase())
      )
    })
  }, [friendshipVersion])

  if (userId === undefined) return null
  if (!hasIncomingRequest || resolved === null) return null

  return (
    <ButtonComponent
      key={'reject-friend-request-button-' + resolved.userId}
      variant={variant}
      destructiveHover={true}
      value="<b>Reject Friend Request</b>"
      fontSize={fontSize}
      icon={{ atlasName: 'icons', spriteName: 'CloseIcon' }}
      uiTransform={uiTransform}
      onMouseDown={() => {
        onPressed?.()
        showConfirmPopup({
          title: `Reject friend request from <b>${resolved.name}</b>?`,
          icon: {
            spriteName: 'CloseIcon',
            atlasName: 'icons',
            backgroundColor: COLOR.BUTTON_PRIMARY
          },
          confirmLabel: 'REJECT',
          category: 'friendship',
          address: resolved.userId,
          onConfirm: async () => {
            markSelfInitiatedFriendshipAction('reject', resolved.userId)
            await BevyApi.social.rejectFriendRequest(resolved.userId)
            // Optimistic: the request is gone, so the item disappears.
            setHasIncomingRequest(false)
            // Tell sibling widgets (FriendButton "Accept Friend") to
            // refetch — only after the RPC resolved, so their refetch
            // observes the post-reject state.
            notifyFriendshipStateChanged()
          }
        })
      }}
    />
  )
}
