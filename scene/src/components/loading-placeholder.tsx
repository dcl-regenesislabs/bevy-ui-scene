import { getFontSize } from '../service/fontsize-system'
import { COLOR } from './color-palette'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity, UiTransformProps } from '@dcl/sdk/react-ecs'
import { getLoadingAlphaValue } from '../service/loading-alpha-color'
import { UiLabelProps } from '@dcl/react-ecs/dist/components/Label/types'

export function LoadingPlaceholder({
  color = COLOR.WHITE_OPACITY_1,
  uiTransform = {
    width: '90%',
    height: '90%',
    margin: '5%',
    borderRadius: getFontSize({}) / 2
  },
  uiText
}: {
  color?: Color4
  uiTransform?: UiTransformProps
  uiText?: UiLabelProps
}) {
  return (
    <UiEntity
      uiBackground={{
        color: { ...color, a: getLoadingAlphaValue() * color.a }
      }}
      uiTransform={{
        ...uiTransform
      }}
      uiText={uiText}
    ></UiEntity>
  )
}
