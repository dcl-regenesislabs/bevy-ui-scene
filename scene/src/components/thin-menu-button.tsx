import ReactEcs, { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { COLOR } from './color-palette'
import Icon from './icon/Icon'
import { getFontSize } from '../service/fontsize-system'
import { noop } from '../utils/function-utils'
import { type Color4 } from '@dcl/sdk/math'
import { ThinButton } from './thin-button'
import { type ReactElement } from '@dcl/react-ecs'

export const ThinMenuButton = ({
  fontSize = getFontSize({}) * 0.9,
  onMouseDown = noop,
  backgroundColor = COLOR.BLACK,
  uiTransform = {}
}: {
  fontSize?: number
  onMouseDown?: () => void
  backgroundColor?: Color4
  lookingUp?: boolean
  uiTransform?: UiTransformProps
}): ReactElement => (
  <ThinButton
    uiTransform={uiTransform}
    onMouseDown={onMouseDown}
    backgroundColor={backgroundColor}
  >
    <Icon
      iconColor={COLOR.WHITE}
      iconSize={fontSize * 0.6 * 2}
      icon={{
        spriteName: 'Menu',
        atlasName: 'icons'
      }}
    />
  </ThinButton>
)
