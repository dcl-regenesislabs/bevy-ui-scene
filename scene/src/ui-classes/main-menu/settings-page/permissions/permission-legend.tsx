import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentScaleRatio } from '../../../../service/canvas-ratio'
import { PermissionBox } from './permission-box'
import { getFontSize } from '../../../../service/fontsize-system'

export function PermissionLegend({
  uiTransform
}: {
  uiTransform?: UiTransformProps
}): ReactElement {
  const fontSize = getFontSize({})
  return (
    <UiEntity uiTransform={{ ...uiTransform }}>
      <UiEntity>
        <UiEntity
          uiText={{
            value: 'Inherit',
            fontSize,
            textAlign: 'middle-center'
          }}
        />
        <PermissionBox value={null} />
      </UiEntity>
      <UiEntity>
        <UiEntity
          uiText={{
            value: 'Ask',
            fontSize,
            textAlign: 'middle-center'
          }}
        />
        <PermissionBox value={'Ask'} />
      </UiEntity>
      <UiEntity>
        <UiEntity
          uiText={{
            value: 'Allow',
            fontSize,
            textAlign: 'middle-center'
          }}
        />
        <PermissionBox value={'Allow'} />
      </UiEntity>
      <UiEntity>
        <UiEntity
          uiText={{
            value: 'Deny',
            fontSize,
            textAlign: 'middle-center'
          }}
        />
        <PermissionBox value={'Deny'} />
      </UiEntity>
    </UiEntity>
  )
}
