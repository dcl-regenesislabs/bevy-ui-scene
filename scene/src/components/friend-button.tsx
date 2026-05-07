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
import { pushPopupAction } from '../state/hud/actions'
import { HUD_POPUP_TYPE } from '../state/hud/state'
import { showConfirmPopup } from './confirm-popup'
import { COLOR } from './color-palette'
import { FEATURES, getFeatureFlag } from '../service/feature-flags'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

/**
 * Friend / Add Friend toggle button.
 *
 * Pass either `player` (preferred) or `userId`. The display name is
 * resolved via `resolvePlayerData` (sync `getPlayer` first, falls back
 * to the catalyst lambda for users not in the scene). `isFriend` is
 * resolved via `BevyApi.social.getFriends()` on mount unless the prop
 * is provided.
 *
 * Visual states:
 *   - friend, idle  → `subtle` variant ("Friend" + FriendIcon).
 *   - friend, hover → `destructive` variant ("Remove Friend" + Unfriends).
 *   - add friend    → `subtle` variant ("Add Friend" + Add).
 *   - loading       → `subtle` placeholder with pulsing opacity.
 */
export function FriendButton({
  player: playerProp,
  userId: userIdProp,
  isFriend: isFriendProp,
  fontSize: fontSizeProp,
  uiTransform
}: {
  player?: GetPlayerDataRes
  userId?: string
  isFriend?: boolean
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
  const [hovered, setHovered] = useState<boolean>(false)
  const isFriend = isFriendProp ?? isFriendInternal

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

  if (userId === undefined) return null

  // Loading placeholder while we resolve the player's name asynchronously.
  if (resolved === null) {
    return (
      <ButtonComponent
        variant="subtle"
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
        variant="subtle"
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

  return (
    <ButtonComponent
      variant="subtle"
      value="<b>Add Friend</b>"
      fontSize={fontSize}
      icon={{ atlasName: 'context', spriteName: 'Add' }}
      uiTransform={uiTransform}
      onMouseDown={() => {
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
