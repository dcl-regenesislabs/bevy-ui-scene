import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type Color4 } from '@dcl/sdk/math'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
import { ButtonTextIcon } from './button-text-icon'
import { COLOR } from './color-palette'
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
import { FEATURES, getFeatureFlag } from '../service/feature-flags'
import { getLoadingAlphaValue } from '../service/loading-alpha-color'
import { noop } from '../utils/function-utils'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

/**
 * Friend / Add Friend toggle button.
 *
 * Pass either `player` (preferred) or `userId`. The display name is
 * resolved via `resolvePlayerData` (sync `getPlayer` first, falls back to
 * the catalyst lambda for users not in the scene). `isFriend` is resolved
 * via `BevyApi.social.getFriends()` on mount unless the prop is provided.
 *
 * Layout / styling escape hatches via `fontSize`, `backgroundColor`,
 * `uiTransform`.
 */
export function FriendButton({
  player: playerProp,
  userId: userIdProp,
  isFriend: isFriendProp,
  fontSize: fontSizeProp,
  backgroundColor,
  uiTransform
}: {
  player?: GetPlayerDataRes
  userId?: string
  isFriend?: boolean
  fontSize?: number
  backgroundColor?: Color4
  uiTransform?: UiTransformProps
}): ReactElement | null {
  const layoutContext = useLayoutContext()
  const fontSize = fontSizeProp ?? getFontSize({ context: layoutContext })

  const userId = playerProp?.userId ?? userIdProp

  // Resolve display name with fallback chain. Seed from playerProp when
  // available so we can render immediately without waiting on a fetch.
  const [resolved, setResolved] = useState<ResolvedPlayerData | null>(
    playerProp != null
      ? {
          userId: playerProp.userId,
          name: playerProp.name,
          hasClaimedName: !!(
            playerProp.name?.length && !playerProp.name?.includes('#')
          )
        }
      : null
  )
  const [isFriendInternal, setIsFriendInternal] = useState<boolean>(false)
  const [hovered, setHovered] = useState<boolean>(false)
  const isFriend = isFriendProp ?? isFriendInternal

  useEffect(() => {
    if (resolved !== null) return
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
      <ButtonTextIcon
        value="<b>...</b>"
        fontSize={fontSize}
        icon={{ atlasName: 'icons', spriteName: 'FriendIcon' }}
        iconColor={COLOR.WHITE}
        fontColor={COLOR.WHITE}
        backgroundColor={backgroundColor}
        uiTransform={{
          borderColor: COLOR.WHITE_OPACITY_1,
          borderWidth: 1,
          opacity: getLoadingAlphaValue(),
          ...uiTransform
        }}
        onMouseDown={noop}
      />
    )
  }

  if (isFriend) {
    return (
      <ButtonTextIcon
        value={hovered ? '<b>Remove Friend</b>' : '<b>Friend</b>'}
        fontSize={fontSize}
        icon={{
          atlasName: hovered ? 'context' : 'icons',
          spriteName: hovered ? 'Unfriends' : 'FriendIcon'
        }}
        iconColor={hovered ? COLOR.RED : COLOR.WHITE}
        fontColor={hovered ? COLOR.RED : COLOR.WHITE}
        backgroundColor={backgroundColor}
        uiTransform={{
          borderColor: hovered ? COLOR.RED : COLOR.WHITE_OPACITY_1,
          borderWidth: 1,
          ...uiTransform
        }}
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
    <ButtonTextIcon
      value="<b>Add Friend</b>"
      fontSize={fontSize}
      icon={{ atlasName: 'context', spriteName: 'Add' }}
      iconColor={COLOR.WHITE}
      fontColor={COLOR.WHITE}
      backgroundColor={backgroundColor}
      uiTransform={{
        borderColor: COLOR.WHITE_OPACITY_1,
        ...uiTransform
      }}
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
