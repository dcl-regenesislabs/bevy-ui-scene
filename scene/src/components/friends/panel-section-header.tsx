import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { noop } from '../../utils/function-utils'
import { getFontSize } from '../../service/fontsize-system'
import { Row } from '../layout'
import { BottomBorder, TopBorder } from '../bottom-border'
import { COLOR } from '../color-palette'

export function PanelSectionHeader({
  children,
  topBorder = true,
  onMouseDown = noop
}: {
  children?: ReactElement
  topBorder?: boolean
  onMouseDown?: () => void
}): ReactElement {
  const fontSize = getFontSize({})
  return (
    <Row
      onMouseDown={onMouseDown}
      uiTransform={{
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}
    >
      {topBorder && (
        <TopBorder color={COLOR.WHITE_OPACITY_1} uiTransform={{ height: 1 }} />
      )}
      <Row
        uiTransform={{
          padding: { left: fontSize / 2 },
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}
      >
        {children}
      </Row>
      <BottomBorder color={COLOR.WHITE_OPACITY_1} uiTransform={{ height: 1 }} />
    </Row>
  )
}
