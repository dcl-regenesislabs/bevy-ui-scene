import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import Icon from '../../../components/icon/Icon'
import { COLOR } from '../../../components/color-palette'
import { Input, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { cloneDeep, noop } from '../../../utils/function-utils'
import selectableValues from './passport-field-selectable-values.json'
import { DropdownComponent } from '../../../components/dropdown-component'
import { store } from '../../../state/store'
import { updateHudStateAction } from '../../../state/hud/actions'
import { type ViewAvatarData } from '../../../state/hud/state'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
type SelectablePropertyKey = keyof typeof selectableValues
const selectableValuesMap: any = Object.keys(selectableValues).reduce(
  // TODO fix any's
  (acc: any, currentKey: any): any => {
    acc[currentKey] = selectableValues[currentKey as SelectablePropertyKey].map(
      (s) => ({
        value: s,
        label: s
      })
    )
    return acc
  },
  {}
)
export const editablePropertyKeys: string[] = [
  'country',
  'language',
  'pronouns',
  'gender',
  'relationshipStatus',
  'sexualOrientation',
  'profession',
  'birthdate',
  'employmentStatus',
  'realName',
  'hobbies'
]

export const labelsPerProperty: Record<string, string> = {
  country: 'country'.toUpperCase(),
  language: 'language'.toUpperCase(),
  pronouns: 'pronouns'.toUpperCase(),
  gender: 'gender'.toUpperCase(),
  relationshipStatus: 'relationship status'.toUpperCase(),
  sexualOrientation: 'sexual orientation'.toUpperCase(),
  employmentStatus: 'employment status'.toUpperCase(),
  profession: 'profession'.toUpperCase(),
  birthdate: 'birthdate'.toUpperCase(),
  realName: 'real name'.toUpperCase(),
  hobbies: 'favorite hobby'.toUpperCase()
}
export const iconsPerProperty: Record<string, string> = {
  country: 'CountryIcn',
  language: 'LanguageIcn',
  gender: 'GenderIcn',
  pronouns: 'PronounsIcn',
  profession: 'ProfessionIcn',
  hobbies: 'HobbiesIcn',
  birthdate: 'BirthdayIcn',
  realName: 'BirthdayIcn',
  sexualOrientation: 'SexOrientationIcn',
  employmentStatus: 'EmploymentStatus',
  relationshipStatus: 'RelationshipIcn'
}
enum INPUT_TYPE {
  TEXT,
  DROPDOWN,
  DATE
}
export const inputTypePerProperty: Record<string, number> = {
  country: INPUT_TYPE.DROPDOWN,
  language: INPUT_TYPE.DROPDOWN,
  gender: INPUT_TYPE.DROPDOWN,
  pronouns: INPUT_TYPE.DROPDOWN,
  profession: INPUT_TYPE.TEXT,
  hobbies: INPUT_TYPE.TEXT,
  birthdate: INPUT_TYPE.DATE,
  realName: INPUT_TYPE.TEXT,
  sexualOrientation: INPUT_TYPE.DROPDOWN,
  employmentStatus: INPUT_TYPE.TEXT,
  description: INPUT_TYPE.TEXT,
  relationshipStatus: INPUT_TYPE.DROPDOWN
}

export function ProfilePropertyField({
  propertyKey,
  profileData,
  editing,
  uiTransform,
  disabled
}: {
  propertyKey: string
  profileData: ViewAvatarData
  editing?: boolean
  uiTransform?: UiTransformProps
  disabled?: boolean
  key?: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'flex-start',
        margin: { top: fontSize },
        ...uiTransform
      }}
    >
      {!!iconsPerProperty[propertyKey] && (
        <Icon
          uiTransform={{
            flexShrink: 0,
            flexGrow: 0,
            positionType: 'absolute',
            position: {
              top: fontSize * 0.6,
              left: fontSize * 0.1
            }
          }}
          icon={{
            atlasName: 'profile',
            spriteName: iconsPerProperty[propertyKey]
          }}
          iconSize={fontSize}
          iconColor={COLOR.INACTIVE}
        />
      )}
      {labelsPerProperty[propertyKey] && (
        <UiEntity
          uiTransform={{
            margin: {
              left: fontSize * 0.75
            }
          }}
          uiText={{
            value: labelsPerProperty[propertyKey],
            fontSize
          }}
        />
      )}
      {editing ? (
        PassportEditableInput({
          type: inputTypePerProperty[propertyKey],
          disabled,
          onChange: (value): void => {
            const newProfileData = cloneDeep(store.getState().hud.profileData)
            newProfileData[propertyKey] = value
            store.dispatch(
              updateHudStateAction({ profileData: newProfileData })
            )
          }
        })
      ) : (
        <UiEntity
          uiTransform={{
            margin: {
              top: -fontSize * 0.6,
              left: fontSize
            },
            width: '100%'
          }}
          uiText={{
            value: formatProfileValue(propertyKey),
            fontSize,
            color: COLOR.TEXT_COLOR_LIGHT_GREY,
            textWrap: 'wrap',
            textAlign: 'top-left'
          }}
        />
      )}
    </UiEntity>
  )

  function formatProfileValue(key: string): string {
    if (key === 'birthdate') {
      return formatEpsilonToShortDate(profileData[key])
    }
    return profileData[key] ?? ''
  }

  function PassportEditableInput({
    type,
    disabled,
    onChange
  }: {
    type: INPUT_TYPE
    disabled?: boolean
    onChange: (value: any) => void
  }): ReactElement {
    if (type === INPUT_TYPE.TEXT) {
      const fontSize = getFontSize({ context: CONTEXT.DIALOG })
      return (
        <Input
          uiTransform={{
            width: '94%',
            height: fontSize * 2,
            zIndex: 999999,
            borderColor: COLOR.BLACK_TRANSPARENT,
            borderRadius: fontSize / 2,
            borderWidth: 0,
            padding: fontSize * 0.3
          }}
          disabled={disabled}
          uiBackground={{
            color: COLOR.WHITE
          }}
          fontSize={fontSize}
          value={profileData[propertyKey]}
          onChange={onChange}
          onSubmit={noop}
        />
      )
    }

    if (type === INPUT_TYPE.DROPDOWN && propertyKey in selectableValues) {
      return (
        <DropdownComponent
          uiTransform={{
            width: '97%',
            zIndex: 999999,
            height: fontSize * 2,
            borderColor: COLOR.BLACK_TRANSPARENT,
            borderRadius: getContentScaleRatio() * 16,
            borderWidth: 0
          }}
          scroll={true}
          options={selectableValuesMap[propertyKey as SelectablePropertyKey]}
          value={profileData[propertyKey] ?? ''}
          onChange={onChange}
          disabled={disabled}
          listMaxHeight={getContentScaleRatio() * 800}
        />
      )
    }
    if (type === INPUT_TYPE.DATE) {
      return (
        <DateComponent
          uiTransform={{
            width: '97%'
          }}
          value={profileData[propertyKey]}
          onChange={onChange}
          disabled={disabled}
        />
      )
    }
    return <UiEntity uiText={{ value: profileData[propertyKey] }} />
  }
}

function DateComponent({
  value,
  onChange,
  uiTransform,
  fontSize = getFontSize({ context: CONTEXT.DIALOG }),
  disabled = false
}: {
  value: number
  onChange: (epsilonSeconds: number) => void
  uiTransform?: UiTransformProps
  fontSize?: number
  disabled?: boolean
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{ height: fontSize * 2, width: '100%', ...uiTransform }}
    >
      <Input
        fontSize={fontSize}
        uiTransform={{
          width: '94%',
          height: '100%',
          zIndex: 999999,
          borderColor: COLOR.BLACK_TRANSPARENT,
          borderRadius: getContentScaleRatio() * 16,
          borderWidth: 0,
          padding: getContentScaleRatio() * 10
        }}
        disabled={disabled}
        uiBackground={{
          color: Color4.White()
        }}
        value={(value && formatEpsilonToShortDate(value)) || undefined}
        onChange={(value) => {
          const epsilonSeconds = parseEpsilonSeconds(value)
          if (epsilonSeconds !== null) onChange(epsilonSeconds)
        }}
        placeholder={'DD/MM/YYYY'}
      />
    </UiEntity>
  )
}

function parseEpsilonSeconds(value: string): number | null {
  try {
    const date = new Date(value)
    return Math.floor(date.getTime() / 1000)
  } catch (error) {
    return null
  }
}

function formatEpsilonToShortDate(value: number): string {
  const date = new Date(value * 1000)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return `${day.toString().padStart(2, '0')}/${month
    .toString()
    .padStart(2, '0')}/${year}`
}
