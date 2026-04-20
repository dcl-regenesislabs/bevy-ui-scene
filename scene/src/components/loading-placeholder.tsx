import { getFontSize } from '../service/fontsize-system'
import { COLOR } from './color-palette'
import { type Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { getLoadingAlphaValue } from '../service/loading-alpha-color'
import { type UiLabelProps } from '@dcl/react-ecs/dist/components/Label/types'

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
}): ReactEcs.JSX.Element {
  return (
    <UiEntity
      uiBackground={{
        color
      }}
      uiTransform={{
        opacity: getLoadingAlphaValue(),
        ...uiTransform
      }}
      uiText={uiText}
    ></UiEntity>
  )
}
