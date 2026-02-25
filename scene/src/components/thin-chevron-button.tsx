import ReactEcs, { UiEntity, UiTransformProps } from '@dcl/sdk/react-ecs'
import { COLOR } from './color-palette'
import { store } from '../state/store'
import { updateHudStateAction } from '../state/hud/actions'
import Icon from './icon/Icon'
import { getFontSize } from '../service/fontsize-system'
import { noop } from '../utils/function-utils'
import { Color4 } from '@dcl/sdk/math'
import { ThinButton } from './thin-button'
import { Column } from './layout'

export const ThinChevronButton = ({
  fontSize = getFontSize({}) * 0.9,
  onMouseDown = noop,
  backgroundColor = COLOR.BLACK,
  lookingUp = true,
  uiTransform = {}
}: {
  fontSize?: number
  onMouseDown?: () => void
  backgroundColor?: Color4
  lookingUp?: boolean
  uiTransform?: UiTransformProps
}) => (
  <ThinButton
    uiTransform={uiTransform}
    onMouseDown={onMouseDown}
    backgroundColor={backgroundColor}
  >
    <Icon
      iconColor={COLOR.WHITE}
      iconSize={fontSize * 0.6}
      icon={{
        spriteName: 'chevron',
        atlasName: 'icons'
      }}
    />
  </ThinButton>
)
