import ReactEcs, {
  Input,
  type ReactElement,
  UiEntity
} from '@dcl/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { executeTask } from '@dcl/sdk/ecs'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { DropdownComponent } from '../../../components/dropdown-component'
import { store } from '../../../state/store'
import { closeLastPopupAction } from '../../../state/hud/actions'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { showErrorPopup } from '../../../service/error-popup-service'
import { notifyCommunitiesChanged } from '../../../service/communities-events'
import { createCommunity } from '../../../utils/communities-promise-utils'
import {
  CommunityModerationError,
  type CommunityPrivacy,
  type CommunityVisibility
} from '../../../service/communities-types'
import { noop } from '../../../utils/function-utils'
import Icon from '../../../components/icon/Icon'
import useState = ReactEcs.useState

const POPUP_BACKGROUND = Color4.fromHexString('#52247AFF')
const SECTION_LABEL_COLOR = COLOR.WHITE
const SECTION_HELP_COLOR = COLOR.WHITE_OPACITY_5
const NAME_MAX = 30
const DESCRIPTION_MAX = 500

const PRIVACY_OPTIONS = [
  {
    value: 'public' as CommunityPrivacy,
    label:
      'Public — Anyone can become a member, view Community details, and join your Voice Streams'
  },
  {
    value: 'private' as CommunityPrivacy,
    label:
      'Private — Only members can view details; new members must request to join'
  }
]

const VISIBILITY_OPTIONS = [
  {
    value: 'all' as CommunityVisibility,
    label: "Discoverable — Listed in 'Browse Communities' section and search results"
  },
  {
    value: 'unlisted' as CommunityVisibility,
    label: 'Not discoverable — Hidden from search; joinable only via invite link'
  }
]

function FieldLabel({
  text,
  required = false,
  fontSize
}: {
  text: string
  required?: boolean
  fontSize: number
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        margin: { bottom: fontSize * 0.3 }
      }}
      uiText={{
        value: required ? `<b>${text}</b> <color=#FD2D58>*</color>` : `<b>${text}</b>`,
        fontSize,
        color: SECTION_LABEL_COLOR,
        textAlign: 'top-left'
      }}
    />
  )
}

function FieldHelp({
  text,
  fontSize
}: {
  text: string
  fontSize: number
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        margin: { bottom: fontSize * 0.4 }
      }}
      uiText={{
        value: text,
        fontSize,
        color: SECTION_HELP_COLOR,
        textAlign: 'top-left'
      }}
    />
  )
}

const CreateCommunityContent = (): ReactElement => {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const fontSizeCaption = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })

  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [privacy, setPrivacy] = useState<CommunityPrivacy>('public')
  const [visibility, setVisibility] = useState<CommunityVisibility>('all')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [issues, setIssues] = useState<{ name?: string; description?: string }>(
    {}
  )

  const trimmedName = name.trim()
  const trimmedDescription = description.trim()
  const canSubmit =
    !submitting &&
    trimmedName.length > 0 &&
    trimmedDescription.length > 0 &&
    trimmedDescription.length <= DESCRIPTION_MAX

  const onCreate = (): void => {
    if (!canSubmit) return
    setIssues({})
    setSubmitting(true)
    executeTask(async () => {
      try {
        await createCommunity({
          name: trimmedName,
          description: trimmedDescription,
          privacy,
          visibility
        })
        notifyCommunitiesChanged()
        store.dispatch(closeLastPopupAction())
      } catch (error) {
        if (error instanceof CommunityModerationError) {
          setIssues({
            name: error.issues.name?.[0],
            description: error.issues.description?.[0]
          })
        } else {
          showErrorPopup(
            error instanceof Error ? error : new Error(String(error)),
            'createCommunity'
          )
        }
      } finally {
        setSubmitting(false)
      }
    })
  }

  return (
    <Column
      uiTransform={{
        width: '100%',
        height: '100%',
        padding: 0
      }}
    >
      {/* Title */}
      <UiEntity
        uiTransform={{
          width: '100%',
          margin: { bottom: fontSize * 1.5 }
        }}
        uiText={{
          value: '<b>Create a Community</b>',
          fontSize: fontSizeTitle,
          color: COLOR.WHITE,
          textAlign: 'top-left'
        }}
      />

      {/* Profile picture (display-only — file upload not yet supported) */}
      <FieldLabel text="PROFILE PICTURE" fontSize={fontSizeSmall} />
      <FieldHelp
        text="PNG or JPG | 512x512 px | 500KB max"
        fontSize={fontSizeCaption}
      />
      <UiEntity
        uiTransform={{
          width: fontSize * 6,
          height: fontSize * 6,
          borderRadius: fontSize / 2,
          borderWidth: 1,
          borderColor: COLOR.WHITE_OPACITY_5,
          margin: { bottom: fontSize },
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Icon
          icon={{ atlasName: 'icons', spriteName: 'Edit' }}
          iconSize={fontSize}
          iconColor={COLOR.WHITE_OPACITY_5}
        />
      </UiEntity>

      {/* Name */}
      <FieldLabel text="COMMUNITY NAME" required fontSize={fontSizeSmall} />
      <Input
        uiTransform={{
          width: '100%',
          height: fontSize * 2.4,
          borderRadius: fontSize / 2,
          borderWidth: 0,
          padding: { left: fontSize, right: fontSize },
          margin: { bottom: fontSize * 0.3 }
        }}
        uiBackground={{ color: COLOR.WHITE }}
        value={name}
        placeholder="Write here"
        placeholderColor={COLOR.TEXT_COLOR_GREY}
        fontSize={fontSize}
        color={COLOR.TEXT_COLOR}
        disabled={submitting}
        onChange={(value) => {
          if (value.length <= NAME_MAX) setName(value)
        }}
      />
      {issues.name != null && (
        <UiEntity
          uiTransform={{ width: '100%', margin: { bottom: fontSize * 0.3 } }}
          uiText={{
            value: issues.name,
            fontSize: fontSizeCaption,
            color: COLOR.BUTTON_PRIMARY,
            textAlign: 'top-left'
          }}
        />
      )}

      {/* Membership */}
      <UiEntity uiTransform={{ width: '100%', margin: { top: fontSize } }}>
        <FieldLabel text="MEMBERSHIP" fontSize={fontSizeSmall} />
      </UiEntity>
      <DropdownComponent
        uiTransform={{
          width: '100%',
          height: fontSize * 2.4,
          borderRadius: fontSize / 2,
          borderWidth: 0,
          margin: { bottom: fontSize },
          zIndex: 30
        }}
        options={PRIVACY_OPTIONS}
        value={privacy}
        onChange={(v: CommunityPrivacy) => {
          setPrivacy(v)
        }}
        disabled={submitting}
      />

      {/* Discoverability */}
      <FieldLabel text="DISCOVERABILITY" fontSize={fontSizeSmall} />
      <DropdownComponent
        uiTransform={{
          width: '100%',
          height: fontSize * 2.4,
          borderRadius: fontSize / 2,
          borderWidth: 0,
          margin: { bottom: fontSize },
          zIndex: 20
        }}
        options={VISIBILITY_OPTIONS}
        value={visibility}
        onChange={(v: CommunityVisibility) => {
          setVisibility(v)
        }}
        disabled={submitting}
      />

      {/* Description */}
      <FieldLabel text="DESCRIPTION" required fontSize={fontSizeSmall} />
      <FieldHelp
        text="Tell everyone what your Community is about! The first 80 characters of your description will be visible when browsing Communities."
        fontSize={fontSizeCaption}
      />
      <Input
        uiTransform={{
          width: '100%',
          height: fontSize * 6,
          borderRadius: fontSize / 2,
          borderWidth: 0,
          padding: { left: fontSize, right: fontSize, top: fontSize * 0.5 },
          margin: { bottom: fontSize * 0.3 }
        }}
        uiBackground={{ color: COLOR.WHITE }}
        value={description}
        placeholder="Write here"
        placeholderColor={COLOR.TEXT_COLOR_GREY}
        fontSize={fontSize}
        color={COLOR.TEXT_COLOR}
        disabled={submitting}
        onChange={(value) => {
          if (value.length <= DESCRIPTION_MAX) setDescription(value)
        }}
      />
      <UiEntity
        uiTransform={{
          width: '100%',
          margin: { bottom: fontSize }
        }}
        uiText={{
          value: `${description.length} / ${DESCRIPTION_MAX}`,
          fontSize: fontSizeCaption,
          color: SECTION_HELP_COLOR,
          textAlign: 'top-right'
        }}
      />
      {issues.description != null && (
        <UiEntity
          uiTransform={{ width: '100%', margin: { bottom: fontSize * 0.3 } }}
          uiText={{
            value: issues.description,
            fontSize: fontSizeCaption,
            color: COLOR.BUTTON_PRIMARY,
            textAlign: 'top-left'
          }}
        />
      )}

      {/* Actions row */}
      <Row
        uiTransform={{
          width: '100%',
          margin: { top: fontSize },
          justifyContent: 'space-between'
        }}
      >
        <UiEntity
          uiTransform={{
            width: '48%',
            height: fontSize * 2.4,
            borderRadius: fontSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting ? 0.4 : 1
          }}
          uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
          uiText={{
            value: '<b>CANCEL</b>',
            fontSize,
            color: COLOR.WHITE
          }}
          onMouseDown={() => {
            if (submitting) return
            store.dispatch(closeLastPopupAction())
          }}
        />
        <UiEntity
          uiTransform={{
            width: '48%',
            height: fontSize * 2.4,
            borderRadius: fontSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: submitting
              ? getLoadingAlphaValue()
              : canSubmit
              ? 1
              : 0.4
          }}
          uiBackground={{ color: COLOR.BUTTON_PRIMARY }}
          uiText={{
            value: '<b>CREATE</b>',
            fontSize,
            color: COLOR.WHITE
          }}
          onMouseDown={onCreate}
        />
      </Row>

      {/* Content-policy progress strip — visible during submit */}
      {submitting && (
        <UiEntity
          uiTransform={{
            width: '100%',
            height: fontSize * 2.4,
            borderRadius: fontSize / 2,
            margin: { top: fontSize },
            alignItems: 'center',
            justifyContent: 'center',
            opacity: getLoadingAlphaValue()
          }}
          uiBackground={{ color: COLOR.WHITE_OPACITY_1 }}
          uiText={{
            value: '◌  Running Content Policy check. This may take a moment.',
            fontSize: fontSizeSmall,
            color: COLOR.WHITE
          }}
        />
      )}

      {/* Footer */}
      <UiEntity
        uiTransform={{
          width: '100%',
          margin: { top: fontSize }
        }}
        uiText={{
          value:
            "Please ensure Community content follows Decentraland's Content Policy.",
          fontSize: fontSizeCaption,
          color: COLOR.WHITE_OPACITY_5,
          textAlign: 'middle-center'
        }}
      />
    </Column>
  )
}

export const CreateCommunityPopup: Popup = () => {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <PopupBackdrop>
      <UiEntity
        uiTransform={{
          width: getContentScaleRatio() * 1100,
          height: getContentScaleRatio() * 1100,
          borderRadius: fontSize,
          padding: {
            top: fontSize * 1.5,
            bottom: fontSize * 1.5,
            left: fontSize * 2,
            right: fontSize * 2
          },
          flexDirection: 'column',
          overflow: 'scroll',
          scrollVisible: 'vertical'
        }}
        uiBackground={{ color: POPUP_BACKGROUND }}
        onMouseDown={noop}
      >
        <CreateCommunityContent />
      </UiEntity>
    </PopupBackdrop>
  )
}
