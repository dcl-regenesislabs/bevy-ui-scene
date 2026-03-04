import ReactEcs, { ReactElement, UiEntity } from '@dcl/react-ecs'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import { COLOR } from '../../../components/color-palette'
import { UiTransformProps } from '@dcl/sdk/react-ecs'

export function PassportSection({
  children,
  uiTransform = {}
}: {
  children?: ReactElement
  uiTransform?: UiTransformProps
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        margin: { top: '1%' },
        padding: '2%',
        width: '96%',
        borderRadius: fontSize / 2,
        borderColor: COLOR.TEXT_COLOR_WHITE,
        borderWidth: 0,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        ...uiTransform
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
    >
      {children}
    </UiEntity>
  )
}
