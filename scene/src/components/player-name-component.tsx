import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type Color4 } from '@dcl/sdk/math'
import { COLOR } from './color-palette'
import { Row } from './layout'
import Icon from './icon/Icon'
import { getAddressColor } from '../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { getNameWithHashPostfix } from '../service/chat/chat-utils'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { getFontSize } from '../service/fontsize-system'
import { type NameColor } from '../service/social-service-type'

export function PlayerNameComponent({
  name,
  address = '',
  hasClaimedName,
  nameColor,
  textColor,
  fontSize,
  bold = true,
  onMouseDown,
  uiTransform
}: {
  name: string
  address?: string
  hasClaimedName: boolean
  nameColor?: NameColor
  textColor?: Color4
  fontSize?: number
  bold?: boolean
  onMouseDown?: () => void
  uiTransform?: UiTransformProps
}): ReactElement {
  const size = fontSize ?? getFontSize({})
  const resolvedColor: Color4 =
    textColor ??
    (hasClaimedName
      ? { ...(nameColor ?? getAddressColor(address)), a: 1 }
      : COLOR.TEXT_COLOR_LIGHT_GREY)
  const displayName = hasClaimedName
    ? name
    : address.length > 0
    ? getNameWithHashPostfix(name, address)
    : name
  const text = bold ? `<b>${displayName}</b>` : displayName

  return (
    <Row
      uiTransform={{ alignItems: 'center', ...uiTransform }}
      onMouseDown={onMouseDown}
    >
      <UiEntity
        uiText={{
          value: text,
          textAlign: 'middle-left',
          color: resolvedColor,
          fontSize: size,
          textWrap: 'nowrap'
        }}
      />
      {hasClaimedName ? (
        <Icon
          uiTransform={{
            position: { left: -size / 4 }
          }}
          icon={{ spriteName: 'Verified', atlasName: 'icons' }}
          iconSize={size}
        />
      ) : null}
    </Row>
  )
}
