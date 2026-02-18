import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { noop } from '../../../utils/function-utils'
import {
  getContentScaleRatio,
  getViewportHeight
} from '../../../service/canvas-ratio'
import { MainContent, ResponsiveContent } from '../backpack-page/BackpackPage'
import {
  LeftSection,
  NavBar,
  NavBarTitle,
  NavButtonBar,
  RightSection
} from '../backpack-page/BackpackNavBar'
import { NavButton } from '../../../components/nav-button/NavButton'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import useState = ReactEcs.useState
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import useEffect = ReactEcs.useEffect
import { BevyApi } from '../../../bevy-api'
import { type ExplorerSetting } from '../../../bevy-api/interface'
import { executeTask } from '@dcl/sdk/ecs'
import { DropdownComponent } from '../../../components/dropdown-component'
import { getMainMenuHeight } from '../MainMenu'
import { UncontrolledBasicSlider } from '../../../components/slider/UncontrolledBasicSlider'
import { roundToStep } from '../../../components/slider/slider-utils'
import Icon from '../../../components/icon/Icon'
import { PERMISSION_DEFINITIONS } from '../../../bevy-api/permission-definitions'
import { PermissionsForm } from './permissions/permissions-form'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'

type SettingCategory =
  | 'General'
  | 'Audio'
  | 'Graphics'
  | 'Gameplay'
  | 'Performance'
  | 'Permissions'
const settingsCategoryTitle: Record<SettingCategory, string> = {
  General: 'General',
  Audio: 'Audio',
  Graphics: 'Graphics',
  Gameplay: 'Gameplay',
  Performance: 'Performance',
  Permissions: 'Permissions'
}

function getSettingsCategoryTitle(category: SettingCategory): string {
  return settingsCategoryTitle[category]
}
export default class SettingsPage {
  mainUi(): ReactElement {
    return (
      <MainContent>
        <SettingsContent />
      </MainContent>
    )
  }

  updateButtons(): void {}
}

function SettingsContent(): ReactElement {
  const [currentCategory, setCurrentCategory] =
    useState<SettingCategory>(`Gameplay`)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ExplorerSetting[]>([])
  useEffect(() => {
    executeTask(async () => {
      setLoading(true)
      setSettings(await getProcessedSettings())
      setLoading(false)
    })
  }, [])

  return (
    <Column uiTransform={{ width: '100%', alignItems: 'center' }}>
      <SettingsNavBar
        currentCategory={currentCategory}
        onChange={(newCat: SettingCategory) => {
          setCurrentCategory(newCat)
        }}
      >
        <NavButton
          uiTransform={{}}
          icon={{ spriteName: 'Reset', atlasName: 'icons' }}
          text={'Reset all defaults'}
          onClick={() => {
            // TODO consider adding a confirm dialog
            executeTask(async () => {
              setLoading(true)

              const _settings = (await BevyApi.getSettings()).map((s) => ({
                ...s,
                value: s.default
              }))

              for (const setting of _settings) {
                await BevyApi.setSetting(setting.name, setting.default)
              }
              setSettings(await getProcessedSettings())
              setLoading(false)
            })
          }}
        />
      </SettingsNavBar>
      <ResponsiveContent>
        {currentCategory === 'Permissions' ? (
          <PermissionsForm permissionDefinitions={PERMISSION_DEFINITIONS} />
        ) : (
          <Column
            uiTransform={{
              width: '80%',
              margin: { top: '1%' },
              padding: '1%',
              pointerFilter: 'block',
              borderRadius: getContentScaleRatio() * 50,
              borderWidth: 0,
              borderColor: COLOR.BLACK_TRANSPARENT
            }}
            uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
          >
            <SettingsCategoryTitle
              title={getSettingsCategoryTitle(currentCategory)}
            />
            {!loading && (
              <UiEntity
                uiTransform={{
                  width: '100%',
                  flexWrap: 'wrap',
                  overflow: 'scroll',
                  height: getViewportHeight() - getMainMenuHeight() * 5
                }}
              >
                {settings
                  .filter((s) => s.category === currentCategory)
                  .map((setting, index) => (
                    <SettingField
                      key={setting.name}
                      uiTransform={{
                        zIndex: settings.length - index
                      }}
                      setting={setting}
                      onChange={(value) => {
                        setting.value = value
                        setSettings([...settings])
                        BevyApi.setSetting(setting.name, value).catch(
                          console.error
                        )
                      }}
                    />
                  ))}
                <UiEntity
                  uiTransform={{
                    /* workaround: this adds space for drodown lists at bottom not being visible withing overflow:scroll */
                    width: '100%',
                    height: getContentScaleRatio() * 500
                  }}
                />
              </UiEntity>
            )}
          </Column>
        )}
      </ResponsiveContent>
    </Column>
  )
}

function SettingField({
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
export function SettingsCategoryTitle({
  title
}: {
  title: string
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{ width: '100%' }}
      uiText={{
        value: title,
        fontSize: getFontSize({
          context: CONTEXT.DIALOG,
          token: TYPOGRAPHY_TOKENS.TITLE_L
        }),
        textAlign: 'top-left'
      }}
    />
  )
}

export function SettingsNavBar({
  currentCategory,
  onChange = noop,
  children
}: {
  currentCategory: SettingCategory
  onChange?: (category: SettingCategory) => void
  children?: ReactElement | ReactElement[] | null
}): ReactElement {
  return (
    <NavBar>
      <LeftSection>
        <NavBarTitle text={'<b>Settings</b>'} />
        <NavButtonBar>
          <NavButton
            icon={{ spriteName: 'ControlsIcn', atlasName: 'icons' }}
            active={currentCategory === `Gameplay`}
            text={settingsCategoryTitle.Gameplay}
            onClick={() => {
              onChange(`Gameplay`)
            }}
          />
          <NavButton
            icon={{ spriteName: 'Graphics', atlasName: 'icons' }}
            uiTransform={{ margin: { left: 12 } }}
            active={currentCategory === `Graphics`}
            text={settingsCategoryTitle.Graphics}
            onClick={() => {
              onChange(`Graphics`)
            }}
          />
          <NavButton
            icon={{ spriteName: 'SpeakerOn', atlasName: 'context' }}
            active={currentCategory === `Audio`}
            text={settingsCategoryTitle.Audio}
            onClick={() => {
              onChange(`Audio`)
            }}
          />
          <NavButton
            icon={{ spriteName: 'Filter', atlasName: 'icons' }}
            active={currentCategory === `Performance`}
            text={settingsCategoryTitle.Performance}
            onClick={() => {
              onChange(`Performance`)
            }}
          />
          <NavButton
            icon={{ spriteName: 'Lock', atlasName: 'icons' }}
            active={currentCategory === `Permissions`}
            text={settingsCategoryTitle.Permissions}
            onClick={() => {
              onChange(`Permissions`)
            }}
          />
        </NavButtonBar>
      </LeftSection>
      <RightSection>{children}</RightSection>
    </NavBar>
  )
}

async function getProcessedSettings(): Promise<ExplorerSetting[]> {
  const settings = await BevyApi.getSettings()

  const processedSettings = settings.map((setting) => {
    // First process the stepSize
    const processedStepSize =
      setting.stepSize !== undefined
        ? Math.round(setting.stepSize * 100) / 100
        : setting.stepSize

    return {
      ...setting,
      stepSize: processedStepSize,
      // Round value to match the processed stepSize precision
      value: roundToStep(setting.value, processedStepSize)
    }
  })
  return processedSettings
}
