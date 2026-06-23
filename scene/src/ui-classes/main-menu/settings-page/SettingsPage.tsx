import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { noop } from '../../../utils/function-utils'
import {
  getContentScaleRatio,
  getViewportHeight
} from '../../../service/canvas-ratio'
import { MainContent } from '../backpack-page/BackpackPage'
import { ResponsiveContent } from '../../../components/responsive-content'
import {
  LeftSection,
  NavBar,
  NavBarTitle,
  NavButtonBar,
  RightSection
} from '../backpack-page/BackpackNavBar'
import { NavButton } from '../../../components/nav-button/NavButton'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/ui-system/layout'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { BevyApi } from '../../../bevy-api'
import { type ExplorerSetting } from '../../../bevy-api/interface'
import { executeTask } from '@dcl/sdk/ecs'
import { getMainMenuHeight } from '../MainMenu'
import { roundToStep } from '../../../components/slider/slider-utils'
import { PERMISSION_DEFINITIONS } from '../../../bevy-api/permission-definitions'
import { PermissionsForm } from './permissions/permissions-form'
import { SettingField } from './setting-field'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import ButtonComponent from '../../../components/ui-system/button-component'
import {
  computePresetUpdates,
  isPresetCategory,
  PRESET_NAMES,
  type SettingsPresetName
} from '../../../utils/settings-presets'

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
    useState<SettingCategory>(`Permissions`)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ExplorerSetting[]>([])
  // Bumped whenever a preset is applied — included in `<SettingField>`
  // keys to force a remount so `UncontrolledBasicSlider` (which only
  // reads `defaultValue` on mount) picks up the new value visually.
  // Individual slider tweaks bypass this so they don't re-mount the
  // field on every release.
  const [presetBumpId, setPresetBumpId] = useState(0)
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
            {!loading && isPresetCategory(currentCategory) && (
              <QualityPresetsRow
                category={currentCategory}
                settings={settings}
                onApply={(updates) => {
                  // Mutate in place to keep object identity stable for
                  // SettingField's defaultValue prop, then trigger a
                  // single re-render with a new array reference.
                  const byName: Record<string, ExplorerSetting> = {}
                  for (const s of settings) byName[s.name] = s
                  for (const { name, value } of updates) {
                    const s = byName[name]
                    if (s !== undefined) s.value = value
                  }
                  setSettings([...settings])
                  setPresetBumpId(presetBumpId + 1)
                  executeTask(async () => {
                    for (const { name, value } of updates) {
                      await BevyApi.setSetting(name, value)
                    }
                  })
                }}
              />
            )}
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
                      key={`${setting.name}:${presetBumpId}`}
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

function QualityPresetsRow({
  category,
  settings,
  onApply
}: {
  category: 'Graphics' | 'Performance'
  settings: ExplorerSetting[]
  onApply: (updates: Array<{ name: string; value: number }>) => void
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <Row
      uiTransform={{
        width: '100%',
        margin: { top: '1%', bottom: '1%' },
        alignItems: 'center'
      }}
    >
      <UiEntity
        uiTransform={{ margin: { right: getContentScaleRatio() * 20 } }}
        uiText={{
          value: '<b>QUALITY PRESET</b>',
          fontSize,
          textAlign: 'middle-left'
        }}
      />
      {PRESET_NAMES.map((presetName: SettingsPresetName) => (
        <ButtonComponent
          key={presetName}
          variant="subtle"
          value={presetName.toUpperCase()}
          uiTransform={{ margin: { right: getContentScaleRatio() * 10 } }}
          fontSize={fontSize}
          onMouseDown={() => {
            const updates = computePresetUpdates(presetName, category, settings)
            if (updates.length > 0) onApply(updates)
          }}
        />
      ))}
    </Row>
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
