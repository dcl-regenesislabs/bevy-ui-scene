import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { BottomBorder } from './bottom-border'
import { COLOR } from './color-palette'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { noop } from '../utils/function-utils'
import { CONTEXT, getFontSize } from '../service/fontsize-system'

export type Tab = {
  text: string
  active?: boolean
}
export function TabComponent({
  tabs,
  fontSize = getFontSize({ context: CONTEXT.DIALOG }),
  uiTransform,
  onClickTab = noop
}: {
  tabs: Tab[]
  fontSize: number
  uiTransform?: UiTransformProps
  onClickTab?: (tabIndex: number) => void
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        ...uiTransform
      }}
    >
      <BottomBorder color={COLOR.WHITE_OPACITY_1} />
      {tabs.map(({ text, active }, index) => (
        <UiEntity
          key={text}
          uiText={{
            value: active ? `<b>${text}</b>` : text,
            color: active ? COLOR.WHITE : COLOR.INACTIVE,
            fontSize
          }}
          onMouseDown={() => {
            onClickTab(index)
          }}
        >
          {active && <BottomBorder color={COLOR.LINK_COLOR} />}
        </UiEntity>
      ))}
    </UiEntity>
  )
}
