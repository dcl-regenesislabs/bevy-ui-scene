import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type Color4 } from '@dcl/sdk/math'
import { COLOR } from './color-palette'
import { Row } from './ui-system/layout'
import Icon from './icon/Icon'
import { getAddressColor } from '../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { getNameWithHashPostfix } from '../service/chat/chat-utils'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { getFontSize } from '../service/fontsize-system'
import { type NameColor } from '../service/social-service-type'
import { openProfileMenu } from '../service/profile-menu-service'

export function PlayerNameComponent({
  name,
  address = '',
  hasClaimedName,
  nameColor,
  textColor,
  fontSize,
  bold = true,
  isGuest = false,
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
  /** Guests have no persistent profile, so the default click is suppressed. */
  isGuest?: boolean
  /** Overrides the default click (which opens the user's profile menu). */
  onMouseDown?: () => void
  uiTransform?: UiTransformProps
}): ReactElement {
  const size = fontSize ?? getFontSize({})
  // Default: clicking the name opens that user's profile menu. Needs an
  // address to resolve the user; callers can override with their own handler.
  const handleClick =
    onMouseDown ??
    (address.length > 0
      ? () => {
          openProfileMenu({ userId: address, name, hasClaimedName, isGuest })
        }
      : undefined)
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
      uiTransform={{ alignItems: 'center', width: 'auto', ...uiTransform }}
      onMouseDown={handleClick}
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
          icon={{ spriteName: 'Verified', atlasName: 'icons' }}
          iconSize={size}
          uiTransform={{ position: { left: -size / 4 } }}
        />
      ) : null}
    </Row>
  )
}
