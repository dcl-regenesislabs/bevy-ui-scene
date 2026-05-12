import ReactEcs, { Input, UiEntity } from '@dcl/react-ecs'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import ButtonComponent from '../../../components/button-component'
import { setLastPopupSubmitting } from '../../../components/popup-stack'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../../utils/ui-utils'
import { noop } from '../../../utils/function-utils'
import { store } from '../../../state/store'
import { closeLastPopupAction } from '../../../state/hud/actions'
import { executeTask } from '@dcl/sdk/ecs'
import { deleteCommunity } from '../../../utils/communities-promise-utils'
import { showErrorPopup } from '../../../service/error-popup-service'
import { notifyCommunitiesChanged } from '../../../service/communities-events'
import { type CommunityListItem } from '../../../service/communities-types'
import useState = ReactEcs.useState

export const ConfirmDeleteCommunityPopup: Popup = ({ shownPopup }) => {
  const community = shownPopup.data as CommunityListItem
  if (community == null) return null

  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })

  const [confirmName, setConfirmName] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const matches = confirmName.trim() === community.name
  const canDelete = matches && !submitting

  const onDelete = (): void => {
    if (!canDelete) return
    setSubmitting(true)
    setLastPopupSubmitting(true)
    executeTask(async () => {
      try {
        await deleteCommunity(community.id)
        notifyCommunitiesChanged()
        setLastPopupSubmitting(false)
        // Close the confirm popup AND the underlying community-view popup so
        // the user isn't left looking at a community that no longer exists.
        store.dispatch(closeLastPopupAction())
        store.dispatch(closeLastPopupAction())
      } catch (error) {
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'deleteCommunity'
        )
        setSubmitting(false)
        setLastPopupSubmitting(false)
      }
    })
  }

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          width: getContentScaleRatio() * 1200,
          borderRadius: BORDER_RADIUS_F,
          padding: {
            top: fontSize * 3,
            bottom: fontSize * 3,
            left: fontSize * 3,
            right: fontSize * 3
          },
          alignItems: 'center'
        }}
        uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
        onMouseDown={noop}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize * 1.5 }
          }}
          uiText={{
            value: `Are you sure you want to delete <b>"${community.name}"</b> Community?`,
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'middle-center',
            textWrap: 'wrap'
          }}
        />
        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize }
          }}
          uiText={{
            value:
              'This action cannot be undone. Write the Community name below to confirm deletion.',
            fontSize: fontSizeSmall,
            color: COLOR.WHITE_OPACITY_5,
            textAlign: 'middle-center',
            textWrap: 'wrap'
          }}
        />

        <Input
          uiTransform={{
            width: '100%',
            height: fontSize * 2.4,
            borderRadius: fontSize / 2,
            borderWidth: 0,
            padding: { left: fontSize, right: fontSize },
            margin: { bottom: fontSize * 1.5 }
          }}
          uiBackground={{ color: COLOR.WHITE }}
          value={confirmName}
          placeholder={community.name}
          placeholderColor={COLOR.TEXT_COLOR_GREY}
          fontSize={fontSize}
          color={COLOR.TEXT_COLOR}
          disabled={submitting}
          onChange={setConfirmName}
        />

        <Row
          uiTransform={{
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <ButtonComponent
            variant="subtle"
            value="<b>CANCEL</b>"
            uiTransform={{ minWidth: '50%' }}
            onMouseDown={() => {
              if (submitting) return
              store.dispatch(closeLastPopupAction())
            }}
          />
          <ButtonComponent
            variant="primary"
            value="<b>DELETE COMMUNITY</b>"
            loading={submitting}
            disabled={!canDelete}
            uiTransform={{ minWidth: '50%' }}
            onMouseDown={onDelete}
          />
        </Row>
      </Column>
    </PopupBackdrop>
  )
}
