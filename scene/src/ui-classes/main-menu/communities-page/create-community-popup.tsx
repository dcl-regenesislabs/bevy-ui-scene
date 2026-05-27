import ReactEcs, { Input, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { executeTask } from '@dcl/sdk/ecs'
import {
  type Popup,
  setLastPopupSubmitting
} from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { DropdownComponent } from '../../../components/dropdown-component'
import ButtonComponent from '../../../components/button-component'
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
import {
  createCommunity,
  updateCommunity
} from '../../../utils/communities-promise-utils'
import {
  CommunityModerationError,
  type CommunityListItem,
  type CommunityPrivacy,
  type CommunityVisibility
} from '../../../service/communities-types'
import { noop } from '../../../utils/function-utils'
import useState = ReactEcs.useState
import { useLayoutContext } from '../../../service/layout-context'
import { type UiLabelProps } from '@dcl/react-ecs/dist/components/Label/types'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { sleep } from '../../../utils/dcl-utils'
import { setUiFocus } from '~system/RestrictedActions'

const POPUP_BACKGROUND = Color4.fromHexString('#52247AFF')
const SECTION_LABEL_COLOR = COLOR.WHITE
const SECTION_HELP_COLOR = COLOR.TEXT_COLOR_LIGHT_GREY
const NAME_MAX = 52
const DESCRIPTION_MAX = 500

const PRIVACY_OPTIONS = [
  {
    value: 'public' as CommunityPrivacy,
    label: 'Public',
    caption:
      'Public — Anyone can become a member, view Community details, and join your Voice Streams'
  },
  {
    value: 'private' as CommunityPrivacy,
    label: 'Private',
    caption:
      'Private — Only members can view details; new members must request to join'
  }
]

const VISIBILITY_OPTIONS = [
  {
    value: 'all' as CommunityVisibility,
    label: 'Discoverable',
    caption:
      "Discoverable — Listed in 'Browse Communities' section and search results"
  },
  {
    value: 'unlisted' as CommunityVisibility,
    label: 'Not discoverable',
    caption:
      'Not discoverable — Hidden from search; joinable only via invite link'
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
        value: required
          ? `<b>${text}</b> <color=#FD2D58>*</color>`
          : `<b>${text}</b>`,
        fontSize,
        color: SECTION_LABEL_COLOR,
        textAlign: 'top-left'
      }}
    />
  )
}

const CommunityFormContent = ({
  editing
}: {
  editing?: CommunityListItem
}): ReactElement => {
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

  const isEdit = editing != null
  const [name, setName] = useState<string>(editing?.name ?? '')
  const [description, setDescription] = useState<string>(
    editing?.description ?? ''
  )
  const [privacy, setPrivacy] = useState<CommunityPrivacy>(
    editing?.privacy ?? 'public'
  )
  const [visibility, setVisibility] = useState<CommunityVisibility>(
    editing?.visibility ?? 'all'
  )
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [issues, setIssues] = useState<{ name?: string; description?: string }>(
    {}
  )
  const [applyWorkaroundNameInput, setWorkaroundNameInput] = useState(false)

  const trimmedName = name.trim()
  const trimmedDescription = description.trim()
  const hasChanges =
    !isEdit ||
    trimmedName !== editing.name ||
    trimmedDescription !== editing.description ||
    privacy !== editing.privacy ||
    visibility !== editing.visibility
  const canSubmit =
    !submitting &&
    trimmedName.length > 0 &&
    trimmedDescription.length > 0 &&
    trimmedDescription.length <= DESCRIPTION_MAX &&
    hasChanges

  const onSubmit = (): void => {
    if (!canSubmit) return
    setIssues({})
    setSubmitting(true)
    setLastPopupSubmitting(true)
    executeTask(async () => {
      try {
        if (isEdit) {
          await updateCommunity(editing.id, {
            name: trimmedName,
            description: trimmedDescription,
            privacy,
            visibility
          })
        } else {
          await createCommunity({
            name: trimmedName,
            description: trimmedDescription,
            privacy,
            visibility
          })
        }
        notifyCommunitiesChanged()
        // Close the form. On edit, also close the underlying community-view
        // popup so the next open reads fresh data — we can't mutate the
        // frozen popup payload in place.
        store.dispatch(closeLastPopupAction())
        if (isEdit) {
          store.dispatch(closeLastPopupAction())
        }
      } catch (error) {
        if (error instanceof CommunityModerationError) {
          setIssues({
            name: error.issues.name?.[0],
            description: error.issues.description?.[0]
          })
        } else {
          showErrorPopup(
            error instanceof Error ? error : new Error(String(error)),
            isEdit ? 'updateCommunity' : 'createCommunity'
          )
        }
      } finally {
        setSubmitting(false)
        setLastPopupSubmitting(false)
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
          value: isEdit ? '<b>Edit Community</b>' : '<b>Create a Community</b>',
          fontSize: fontSizeTitle,
          color: COLOR.WHITE,
          textAlign: 'top-left'
        }}
      />

      {/* Name */}
      <Field>
        <FieldLabel text="COMMUNITY NAME" required fontSize={fontSizeSmall} />
        {!applyWorkaroundNameInput && (
          <Input
            uiTransform={{
              elementId: 'communityNameInput',
              width: '100%',
              height: fontSize * 2.4,
              borderRadius: fontSize / 2,
              borderWidth: 0,
              padding: {
                left: fontSize / 2,
                right: fontSize,
                top: fontSize / 2
              }
            }}
            uiBackground={{ color: COLOR.WHITE }}
            value={name}
            placeholder="Write here"
            placeholderColor={COLOR.TEXT_COLOR_GREY}
            fontSize={fontSize}
            color={COLOR.TEXT_COLOR}
            disabled={submitting}
            onChange={(value) => {
              console.log('value.length', value.length, value, name)
              if (value.length > NAME_MAX) {
                // TODO remove if kind of maxlength is implemented or controlled Input
                setName(value.slice(0, value.length - 1))
                executeTask(async () => {
                  setWorkaroundNameInput(true)
                  await sleep(0)
                  setWorkaroundNameInput(false)
                  setUiFocus({ elementId: 'communityNameInput' }).catch(
                    console.error
                  )
                })
              }
            }}
          />
        )}
        {issues.name != null && (
          <Caption
            uiTransform={{ width: '100%', margin: { bottom: fontSize * 0.3 } }}
            uiText={{
              value: issues.name,
              color: COLOR.BUTTON_PRIMARY,
              textAlign: 'top-left'
            }}
          />
        )}
      </Field>

      <Field>
        <FieldLabel text="MEMBERSHIP" fontSize={fontSizeSmall} />

        <DropdownComponent
          uiTransform={{
            width: '100%',
            height: fontSize * 2.4,
            borderRadius: fontSize / 2,
            borderWidth: 0,

            zIndex: 30
          }}
          options={PRIVACY_OPTIONS}
          value={privacy}
          onChange={(v: CommunityPrivacy) => {
            setPrivacy(v)
          }}
          disabled={submitting}
        />

        <Caption
          uiText={{
            value:
              PRIVACY_OPTIONS.find((p) => p.value === privacy)?.caption ?? ''
          }}
        />
      </Field>
      <Field>
        <FieldLabel text="DISCOVERABILITY" fontSize={fontSizeSmall} />
        <DropdownComponent
          uiTransform={{
            width: '100%',
            height: fontSize * 2.4,
            borderRadius: fontSize / 2,
            borderWidth: 0,

            zIndex: 20
          }}
          options={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={(v: CommunityVisibility) => {
            setVisibility(v)
          }}
          disabled={submitting}
        />
        <Caption
          uiText={{
            value:
              VISIBILITY_OPTIONS.find((p) => p.value === visibility)?.caption ??
              ''
          }}
        />
      </Field>
      <Field>
        <FieldLabel text="DESCRIPTION" required fontSize={fontSizeSmall} />
        <Caption
          uiText={{
            value:
              'Tell everyone what your Community is about! The first 80 characters of your description will be visible when browsing Communities.'
          }}
        />

        <Input
          uiTransform={{
            width: '100%',
            height: fontSize * 6,
            borderRadius: fontSize / 2,
            borderWidth: 0,
            padding: { left: fontSize, right: fontSize, top: fontSize * 0.5 }
          }}
          multiLine={true}
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
        <Caption
          uiTransform={{
            width: '100%'
          }}
          uiText={{
            value: `${description.length} / ${DESCRIPTION_MAX}`,
            textAlign: 'top-right'
          }}
        />
        {issues.description != null && (
          <Caption
            uiTransform={{ width: '100%', margin: { bottom: fontSize * 0.3 } }}
            uiText={{
              value: issues.description,
              fontSize: fontSizeCaption,
              color: COLOR.BUTTON_PRIMARY,
              textAlign: 'top-left'
            }}
          />
        )}
      </Field>
      {/* Actions row */}
      <Row childrenGrow childrenGap={fontSize / 2}>
        <ButtonComponent
          variant="subtle"
          value="<b>CANCEL</b>"
          fontSize={fontSize}
          disabled={submitting}
          uiTransform={{ height: fontSize * 2.4 }}
          onMouseDown={() => {
            store.dispatch(closeLastPopupAction())
          }}
        />
        <ButtonComponent
          variant="primary"
          value={isEdit ? '<b>SAVE CHANGES</b>' : '<b>CREATE</b>'}
          fontSize={fontSize}
          disabled={!canSubmit}
          loading={submitting}
          uiTransform={{ height: fontSize * 2.4 }}
          onMouseDown={onSubmit}
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
      <Caption
        uiTransform={{
          width: '100%',
          margin: { top: fontSize * 2 }
        }}
        uiText={{
          value:
            "Please ensure Community content follows Decentraland's Content Policy.",
          color: COLOR.WHITE_OPACITY_5,
          textAlign: 'middle-center'
        }}
      />
    </Column>
  )
}

export const CreateCommunityPopup: Popup = ({ shownPopup }) => {
  const context = useLayoutContext()
  const fontSize = getFontSize({ context })
  // When `data` is provided, the form opens in edit mode.
  const editing = shownPopup.data as CommunityListItem | undefined
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
        <CommunityFormContent editing={editing} />
      </UiEntity>
    </PopupBackdrop>
  )
}
function Caption({
  uiText,
  uiTransform
}: {
  uiText: UiLabelProps
  uiTransform?: UiTransformProps
}): ReactElement {
  const layoutContext = useLayoutContext()
  const fontSize = getFontSize({
    context: layoutContext,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        ...uiTransform
      }}
      uiText={{
        fontSize,
        color: SECTION_HELP_COLOR,
        textAlign: 'top-left',
        ...uiText
      }}
    />
  )
}

function Field({ children }: { children?: ReactElement }): ReactElement {
  return (
    <Column
      uiTransform={{
        margin: { bottom: getFontSize({ context: useLayoutContext() }) }
      }}
    >
      {children}
    </Column>
  )
}
