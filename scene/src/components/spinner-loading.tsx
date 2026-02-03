import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { rotateUVs } from '../utils/ui-utils'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'

export function SpinnerLoading({
  uiTransform
}: {
  uiTransform: UiTransformProps
}): ReactElement | null {
  return (
    <UiEntity
      uiTransform={{ ...uiTransform }}
      uiBackground={{
        textureMode: 'stretch',
        uvs: rotateUVs(((Date.now() % 1000) / 1000) * 360),
        texture: {
          src: 'assets/images/spinner-mini.png',
          filterMode: 'bi-linear',
          wrapMode: 'clamp'
        }
      }}
    />
  )
}
