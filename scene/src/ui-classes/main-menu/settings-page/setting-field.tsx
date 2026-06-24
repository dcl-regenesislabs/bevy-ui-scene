import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
import useState = ReactEcs.useState
import { noop } from '../../../utils/function-utils'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/ui-system/layout'
import { type ExplorerSetting } from '../../../bevy-api/interface'
import { DropdownComponent } from '../../../components/dropdown-component'
import { UncontrolledBasicSlider } from '../../../components/slider/UncontrolledBasicSlider'
import Icon from '../../../components/icon/Icon'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'

export function SettingField({
  setting,
  uiTransform,
  onChange = noop
}: {
  setting: ExplorerSetting
  uiTransform?: UiTransformProps
  onChange?: (value: number) => void
  key?: any // TODO look for all key?: any and replace with key?: Key
}): ReactElement {
  const [refValue, setRefValue] = useState<string>(setting.value.toString())
  const [showTooltip, setShowTooltip] = useState(false)
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  // TODO SLIDERS SHOULD HAVE ARROWS IN LEFT AND RIGHT ?
  return (
    <Column
      uiTransform={{
        width: '48%',
        flexShrink: 0,
        margin: { left: '1%', top: '2%' },
        ...uiTransform
      }}
    >
      {showTooltip && (
        <UiEntity
          uiTransform={{
            width: '90%',
            positionType: 'absolute',
            position: { left: '10%', top: getContentScaleRatio() * 52 },
            padding: getContentScaleRatio() * 20,
            zIndex: 99
          }}
          uiBackground={{
            color: COLOR.BLACK
          }}
          uiText={{
            value: `${setting.description}`,
            textAlign: 'top-left',
            fontSize,
            textWrap: 'wrap'
          }}
        />
      )}
      <Row>
        <UiEntity
          uiTransform={{ alignItems: 'flex-start' }}
          uiText={{
            value: `${setting.name}`,
            textAlign: 'top-left',
            fontSize,
            textWrap: 'nowrap'
          }}
        />
        <Icon
          uiTransform={{
            flexShrink: 0,
            flexGrow: 0,
            positionType: 'relative',
            position: { left: 0 }
          }}
          icon={{ spriteName: 'InfoButton', atlasName: 'icons' }}
          onMouseEnter={() => {
            setShowTooltip(true)
          }}
          onMouseLeave={() => {
            executeTask(async () => {
              setShowTooltip(false)
            })
          }}
          iconColor={COLOR.WHITE}
          iconSize={fontSize}
        />

        {!(setting.namedVariants?.length > 0) && (
          <UiEntity
            uiTransform={{
              alignItems: 'flex-end',
              flexWrap: 'nowrap',
              flexShrink: 0,
              position: { right: '12%' },
              positionType: 'absolute'
            }}
            uiText={{
              value: `${refValue}`,
              textAlign: 'top-right',
              fontSize,
              textWrap: 'nowrap'
            }}
          />
        )}
      </Row>
      {setting.namedVariants?.length > 0 ? (
        <DropdownComponent
          fontSize={fontSize}
          options={setting.namedVariants.map(({ name, description }) => ({
            label: name,
            value: name
          }))}
          uiTransform={{
            width: '95%',
            margin: { left: '1%' }
          }}
          value={setting.namedVariants[setting.value].name}
          onChange={(value) => {
            const indexOfValue = setting.namedVariants.findIndex(
              (variant) => variant.name === value
            )
            onChange(indexOfValue)
          }}
        />
      ) : (
        <UncontrolledBasicSlider
          showStepButtons={true}
          min={setting.minValue}
          max={setting.maxValue}
          defaultValue={setting.value}
          stepSize={setting.stepSize}
          uiTransform={{
            alignSelf: 'center',
            width: '100%',
            height: getContentScaleRatio() * 100
          }}
          onChange={(value) => {
            // onChange(value)
            setRefValue(value.toString())
          }}
          onRelease={(value) => {
            onChange(value)
          }}
          uiBackground={{
            color: COLOR.BLACK_TRANSPARENT
          }}
          backgroundBar={COLOR.RED}
        ></UncontrolledBasicSlider>
      )}
    </Column>
  )
}
