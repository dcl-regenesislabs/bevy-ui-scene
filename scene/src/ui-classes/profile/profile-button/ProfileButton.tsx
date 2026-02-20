import ReactEcs, { UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { type ReactElement } from '@dcl/react-ecs'
import { Row } from '../../../components/layout'
import { AvatarCircle } from '../../../components/avatar-circle'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'
import { getPlayer } from '@dcl/sdk/players'
import { getMainMenuHeight } from '../../main-menu/MainMenu'
import { Color4 } from '@dcl/sdk/math'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { getFontSize } from '../../../service/fontsize-system'
const LIGHT_TRANSPARENT = Color4.create(1, 1, 1, 0.03)

export function ProfileButton({
  uiTransform
}: {
  uiTransform?: UiTransformProps
}): ReactElement | null {
  const player = getPlayer()
  const avatarSize = getMainMenuHeight() * 0.7

  if (!player) return null

  const showProfilePopup = (): void => {
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.PROFILE_MENU,
        data: {
          player
        }
      })
    )
  }
  return (
    <Row
      uiTransform={{
        borderRadius: 999,
        height: avatarSize * 1.1,
        flexGrow: 1,
        ...uiTransform
      }}
      uiBackground={{
        color: LIGHT_TRANSPARENT
      }}
      onMouseDown={() => {
        showProfilePopup()
      }}
    >
      <AvatarCircle
        userId={player.userId}
        circleColor={getAddressColor(player.userId)}
        uiTransform={{
          width: avatarSize,
          height: avatarSize,
          position: { left: avatarSize * 0.1 },
          borderWidth: avatarSize * 0.05
        }}
        isGuest={player.isGuest}
        onMouseDown={() => {
          showProfilePopup()
        }}
      />
      <UiEntity
        uiTransform={{
          margin: { left: '1%' }
        }}
        uiText={{
          color: getAddressColor(player.userId),
          value: `<b> ${player.name}  </b>`,
          fontSize: getFontSize({}),
          textWrap: 'nowrap'
        }}
      />
    </Row>
  )
}
