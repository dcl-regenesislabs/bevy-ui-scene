import type { Color4 } from '@dcl/sdk/math'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { ROUNDED_TEXTURE_BACKGROUND } from '../utils/constants'
import { Label, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { COLOR } from './color-palette'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../service/fontsize-system'

export function Tag({
  text,
  canvasScaleRatio, // TODO canvasScaleRatio must not be here, other containers use other measures/responsiveness methods
  backgroundColor,
  uiTransform,
  textColor = COLOR.WHITE,
  fontSize = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TAG
  })
}: {
  text: string
  canvasScaleRatio: number
  backgroundColor: Color4
  uiTransform?: UiTransformProps
  textColor?: Color4
  fontSize?: number
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        flexShrink: 0,
        flexGrow: 0,
        flexBasis: 0,
        ...uiTransform
      }}
    >
      <UiEntity
        uiTransform={{
          padding: {
            left: 6 * canvasScaleRatio,
            right: 6 * canvasScaleRatio
          }
        }}
        uiBackground={{
          ...ROUNDED_TEXTURE_BACKGROUND,
          color: backgroundColor
        }}
      >
        <Label value={text} color={textColor} fontSize={fontSize} />
      </UiEntity>
    </UiEntity>
  )
}
