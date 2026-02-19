import ReactEcs, { Button, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { store } from '../../../state/store'
import { COLOR } from '../../../components/color-palette'
import {
  closeLastPopupAction,
  updateHudStateAction
} from '../../../state/hud/actions'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../../utils/ui-utils'
import { cloneDeep, noop } from '../../../utils/function-utils'
import { type Popup } from '../../../components/popup-stack'
import { type Tab, TabComponent } from '../../../components/tab-component'
import { fetchAllUserNames } from '../../../utils/passport-promise-utils'
import { executeTask } from '@dcl/sdk/ecs'
import { sleep, waitFor } from '../../../utils/dcl-utils'
import { DropdownComponent } from '../../../components/dropdown-component'
import { openExternalUrl } from '~system/RestrictedActions'
import { Input } from '@dcl/sdk/react-ecs'
import { BevyApi } from '../../../bevy-api'
import useEffect = ReactEcs.useEffect
import { type SetAvatarData } from '../../../bevy-api/interface'
import { type InputOption } from '../../../utils/definitions'
import { getPlayer } from '@dcl/sdk/players'
import { showErrorPopup } from '../../../service/error-popup-service'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'

const { useState } = ReactEcs

const NAME_EDIT_TABS = [
  { text: 'UNIQUE NAME' },
  { text: 'NON-UNIQUE USERNAME' }
]
const BUTTON_TEXT_COLOR = { ...COLOR.WHITE }

const EditNameContent = (): ReactElement => {
  const profileData = store.getState().hud.profileData
  const [selectableNames, setSelectableNames] = useState<InputOption[]>([
    { value: '', label: '' }
  ])
  const [selectedName, setSelectedName] = useState<string>(
    profileData.name ?? ''
  )
  const [customName, setCustomName] = useState<string>(profileData.name ?? '')

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<number>(
    selectableNames.find((s) => s.value === profileData.name) ? 0 : 1
  )
  const [tabs, setTabs] = useState<Tab[]>(NAME_EDIT_TABS)

  useEffect((): void => {
    executeTask(async () => {
      setLoading(true)

      await waitFor(() => !!store.getState().hud.profileData.userId)

      const profileData = store.getState().hud.profileData
      const nameDefinitions = await fetchAllUserNames({
        userId: profileData.userId
      })
      const names = nameDefinitions.map((n) => n.name).concat('')
      const activeTab = names.length && names.includes(profileData.name) ? 0 : 1

      const tabs = nameDefinitions.length
        ? cloneDeep(NAME_EDIT_TABS).map((tabDefinition, index) => {
            return { ...tabDefinition, active: index === activeTab }
          })
        : []

      setActiveTab(activeTab)
      setTabs(tabs)
      setSelectableNames(names.map((n) => ({ value: n, label: n })))
      setSelectedName(!names.includes(profileData.name) ? '' : profileData.name)
      setCustomName(names.includes(profileData.name) ? '' : profileData.name)
      setLoading(false)
      setCustomName(profileData.hasClaimedName ? '' : profileData.name)
    })
  }, [])
  const onSave = (selectedName: string): void => {
    const hasClaimedName = !!(selectableNames ?? []).find(
      (s) => s.value === selectedName
    )
    executeTask(async () => {
      setLoading(true)
      let failed = false
      const avatarPayload: SetAvatarData = {
        base: {
          ...store.getState().backpack.outfitSetup.base,
          name: selectedName
        },
        hasClaimedName
      }

      await BevyApi.setAvatar(avatarPayload).catch((error) => {
        console.error('onSave error', error)
        showErrorPopup(
          error,
          `BevyApi.setAvatar ${JSON.stringify(avatarPayload)}`
        )
        failed = true
      })
      setLoading(false)
      if (!failed) {
        store.dispatch(closeLastPopupAction())
        store.dispatch(
          updateHudStateAction({
            profileData: {
              ...store.getState().hud.profileData,
              name: selectedName,
              hasClaimedName
            }
          })
        )
      }
    })
  }

  const fontSize_title_L = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: 0,
        margin: 0
      }}
    >
      <UiEntity
        uiText={{
          value: '<b>Edit Username</b>',
          fontSize: fontSize_title_L
        }}
      />
      <UiEntity
        uiTransform={{
          width: '100%',
          padding: '2%',
          flexDirection: 'column',
          alignItems: 'flex-start',
          zIndex: 1
        }}
      >
        {(tabs?.length ?? 0) > 0 ? (
          <TabComponent
            tabs={tabs}
            uiTransform={{ width: '100%', margin: { bottom: '2%' } }}
            onClickTab={(activeTab: number) => {
              const tabs = cloneDeep(NAME_EDIT_TABS).map(
                (tabDefinition, index) => {
                  return { ...tabDefinition, active: index === activeTab }
                }
              )
              setActiveTab(activeTab)
              setTabs(tabs)
            }}
          />
        ) : null}

        {!loading && activeTab === 0 && selectableNames.length > 1 && (
          <UniqueNameForm
            selectableNames={selectableNames}
            selectedName={selectedName}
            onChange={(value: string) => {
              setSelectedName(value)
            }}
            disabled={loading}
            onSave={onSave}
          />
        )}
        {!loading && activeTab === 1 && (
          <NameForm
            value={customName}
            onChange={(value: string) => {
              setCustomName(value)
            }}
            disabled={loading}
            onSave={onSave}
          />
        )}
      </UiEntity>

      <UiEntity
        uiBackground={{
          textureMode: 'stretch',
          texture: {
            src: 'assets/images/claim_name_banner.png'
          }
        }}
        uiTransform={{
          width: '100%',
          height: '50%',
          positionType: 'absolute',
          position: { bottom: 0 },
          opacity: loading ? 0.5 : 1
        }}
        onMouseDown={() => {
          executeTask(async () => {
            setLoading(true)
            openExternalUrl({
              url: 'https://decentraland.org/marketplace/names/claim'
            }).catch(console.error)
            await sleep(1000)
            setLoading(false)
          })
        }}
      />
    </UiEntity>
  )
}

export const NameForm = ({
  disabled = false,
  onChange = noop,
  onSave = noop,
  value = ''
}: {
  disabled?: boolean
  onChange?: (value: string) => void
  onSave?: (value: string) => void
  value?: string
}): ReactElement => {
  const [textValue, setTextValue] = useState(value)
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity uiTransform={{ flexDirection: 'column', width: '100%' }}>
      <Input
        uiTransform={{
          width: '97%',
          flexShrink: 0,
          flexGrow: 0,
          borderColor: COLOR.BLACK_TRANSPARENT,
          borderRadius: fontSize / 2,
          borderWidth: 0,
          height: fontSize * 2,
          padding: {
            left: getContentScaleRatio() * 20,
            top: getContentScaleRatio() * 20,
            bottom: getContentScaleRatio() * 20,
            right: getContentScaleRatio() * 150
          }
        }}
        fontSize={fontSize}
        uiBackground={{
          color: COLOR.WHITE
        }}
        value={textValue}
        onChange={(value) => {
          setTextValue(value)
          onChange(value)
        }}
        disabled={disabled}
        placeholder={'Write a name...'}
      />
      <UiEntity
        uiTransform={{
          width: '100%',
          positionType: 'absolute',
          position: {
            top: fontSize * 1.75
          }
        }}
        uiText={{
          value: `${textValue.length} / 15`,
          color: COLOR.TEXT_COLOR_LIGHT_GREY,
          fontSize: getFontSize({
            context: CONTEXT.DIALOG,
            token: TYPOGRAPHY_TOKENS.BODY_S
          }),
          textAlign: 'top-left'
        }}
      />
      <UiEntity
        uiTransform={{
          width: '92%',
          positionType: 'absolute'
        }}
        uiText={{
          value: `#${(getPlayer()?.userId ?? '').slice(-4)}`,
          color: COLOR.TEXT_COLOR_GREY,
          fontSize: fontSize,
          textAlign: 'top-right'
        }}
      />

      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          margin: { top: '5%' },
          width: '100%'
        }}
      >
        <Button
          uiTransform={{
            borderRadius: getContentScaleRatio() * 20,
            borderColor: COLOR.WHITE_OPACITY_1,
            borderWidth: 0,
            width: '40%',
            margin: { right: '5%' },
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0
          }}
          fontSize={fontSize}
          uiBackground={{
            color: COLOR.WHITE_OPACITY_1
          }}
          disabled={disabled}
          color={BUTTON_TEXT_COLOR}
          value={'CANCEL'}
          onMouseDown={() => {
            store.dispatch(closeLastPopupAction())
          }}
        />

        <Button
          variant={'primary'}
          uiTransform={{
            width: '40%',
            borderRadius: getContentScaleRatio() * 20,
            borderColor: COLOR.BLACK_TRANSPARENT,
            borderWidth: 0,

            opacity: disabled ? 0.5 : 1,
            flexShrink: 0
          }}
          fontSize={fontSize}
          value={'SAVE'}
          disabled={disabled || !textValue?.length || isInvalidName(textValue)}
          onMouseDown={() => {
            onSave(textValue)
          }}
        />
      </UiEntity>
    </UiEntity>
  )

  function isInvalidName(name: string): boolean {
    if (name.indexOf(' ') > 1) return true
    if (name.length > 15) return true

    return false
  }
}

export const UniqueNameForm = ({
  selectableNames,
  selectedName,
  disabled = false,
  onChange = noop,
  onSave = noop
}: {
  selectableNames: InputOption[]
  selectedName: string
  disabled?: boolean
  onChange?: (value: string) => void
  onSave?: (selectedName: string) => void
}): ReactElement => {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{ flexDirection: 'column', width: '100%', zIndex: 1 }}
    >
      <DropdownComponent
        uiTransform={{
          width: '97%',
          height: fontSize * 2,
          zIndex: 999999,
          borderColor: COLOR.BLACK_TRANSPARENT,
          borderRadius: getContentScaleRatio() * 30,
          borderWidth: 0
        }}
        scroll={true}
        options={selectableNames}
        value={selectedName}
        onChange={onChange}
        disabled={disabled}
      />
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          margin: { top: '5%' },
          width: '100%'
        }}
      >
        <Button
          uiTransform={{
            borderRadius: getContentScaleRatio() * 20,
            borderColor: COLOR.WHITE_OPACITY_1,
            borderWidth: 0,
            width: '40%',
            margin: { right: '5%' },
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0
          }}
          fontSize={fontSize}
          uiBackground={{
            color: COLOR.WHITE_OPACITY_1
          }}
          disabled={disabled}
          color={BUTTON_TEXT_COLOR}
          value={'CANCEL'}
          onMouseDown={() => {
            store.dispatch(closeLastPopupAction())
          }}
        />
        <Button
          variant={'primary'}
          uiTransform={{
            width: '40%',
            borderRadius: fontSize / 2,
            borderColor: COLOR.BLACK_TRANSPARENT,
            borderWidth: 0,
            flexShrink: 0,
            justifyContent: 'center',
            alignItems: 'center',
            alignContent: 'center'
          }}
          fontSize={fontSize}
          value={'SAVE'}
          disabled={
            disabled || selectedName === store.getState().hud.profileData.name
          }
          onMouseDown={() => {
            onSave(selectedName)
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}

export const NameEditPopup: Popup = () => {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        zIndex: 999,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_7
      }}
      onMouseDown={() => {
        closeDialog()
      }}
    >
      <UiEntity
        uiTransform={{
          width: getContentScaleRatio() * 1200,
          height: getContentScaleRatio() * 1049,
          borderRadius: BORDER_RADIUS_F,
          borderWidth: 0,
          borderColor: COLOR.WHITE,
          alignItems: 'flex-start',
          flexDirection: 'column',
          padding: 0
        }}
        onMouseDown={noop}
        uiBackground={{
          color: COLOR.URL_POPUP_BACKGROUND
        }}
      >
        <EditNameContent />
      </UiEntity>
    </UiEntity>
  )

  function closeDialog(): void {
    store.dispatch(closeLastPopupAction())
  }
}
