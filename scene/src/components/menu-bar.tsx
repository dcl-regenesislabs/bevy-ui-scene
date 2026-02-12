import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { BottomBorder } from './bottom-border'
import { COLOR } from './color-palette'
import { getContentScaleRatio } from '../service/canvas-ratio'
import { Row } from './layout'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../service/fontsize-system'

export const MenuBar = ({
  items,
  activeIndex,
  onClick
}: {
  items: string[]
  activeIndex: number
  onClick: (index: number) => void
}): ReactElement => (
  <Row uiTransform={{ justifyContent: 'center' }}>
    <BottomBorder
      uiTransform={{ height: getContentScaleRatio() * 2 }}
      color={COLOR.TEXT_COLOR_GREY}
    />
    {items.map((item, index) => (
      <UiEntity
        key={item}
        uiText={{
          value: item,
          fontSize: getFontSize({ token: TYPOGRAPHY_TOKENS.TITLE_M }),
          color: COLOR.TEXT_COLOR
        }}
        onMouseDown={() => {
          onClick(index)
        }}
      >
        {activeIndex === index && (
          <BottomBorder color={COLOR.ACTIVE_BACKGROUND_COLOR} />
        )}
      </UiEntity>
    ))}
  </Row>
)
