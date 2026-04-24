import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import Icon from '../../../components/icon/Icon'
import type { EventFromApi } from '../../scene-info-card/SceneInfoCard.types'
import { createAttendee, removeAttendee } from '../../../utils/promise-utils'
import { updateCachedCommunityEvent } from '../../../utils/communities-promise-utils'
import { executeTask } from '@dcl/sdk/ecs'
import { copyToClipboard, openExternalUrl } from '~system/RestrictedActions'
import { showErrorPopup } from '../../../service/error-popup-service'
import type { Atlas } from '../../../utils/definitions'
import useState = ReactEcs.useState
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { ButtonTextIcon } from '../../../components/button-text-icon'

/** Format ISO timestamp as YYYYMMDDTHHmmssZ (Google Calendar format). */
function toCalendarDate(iso: string): string {
  return iso.replace(/[-:.]/g, '').replace(/\.\d+Z$/, 'Z')
}

export function CommunityEventActionsRow({
  event,
  uiTransform
}: {
  event: EventFromApi
  uiTransform?: UiTransformProps
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })

  const [attending, setAttending] = useState<boolean>(event.attending ?? false)
  const [toggling, setToggling] = useState<boolean>(false)

  const startAt = event.next_start_at ?? event.start_at
  const finishAt = event.next_finish_at ?? event.finish_at

  const buttonPadding = {
    left: fontSize * 0.6,
    right: fontSize * 0.8,
    top: fontSize * 0.3,
    bottom: fontSize * 0.3
  }
  const buttonBaseTransform: UiTransformProps = {
    borderRadius: fontSize / 2,
    borderWidth: 1,
    borderColor: COLOR.WHITE,
    padding: buttonPadding,
    margin: { right: fontSize * 0.5 },
    flexGrow: 0,
    width: 'auto'
  }

  const toggleReminder = (): void => {
    if (toggling) return
    const next = !attending
    setAttending(next)
    setToggling(true)
    executeTask(async () => {
      try {
        if (next) {
          await createAttendee(event.id)
        } else {
          await removeAttendee(event.id)
        }
        updateCachedCommunityEvent(event.id, { attending: next })
      } catch (error) {
        setAttending(!next)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          next ? 'createAttendee' : 'removeAttendee'
        )
      } finally {
        setToggling(false)
      }
    })
  }

  const onAddToCalendar = (): void => {
    const title = encodeURIComponent(event.name)
    const details = encodeURIComponent(event.description ?? '')
    const location = encodeURIComponent(event.url ?? '')
    const dates = `${toCalendarDate(startAt)}/${toCalendarDate(finishAt)}`
    void openExternalUrl({
      url: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`
    })
  }

  const onShareX = (): void => {
    const text = `Check out "${event.name}" \n\n An event in @Decentraland!\n\n`
    const url = event.url ?? ''
    void openExternalUrl({
      url: `https://x.com/intent/post?text=${encodeURIComponent(
        text
      )}&hashtags=DCLEvent&url=${encodeURIComponent(url)}`
    })
  }

  return (
    <Row
      uiTransform={{
        alignItems: 'center',
        ...uiTransform
      }}
    >
      {/* REMIND ME */}
      <ButtonTextIcon
        value={attending ? '<b>SUBSCRIBED</b>' : '<b>REMIND ME</b>'}
        icon={{
          spriteName: attending ? 'ReminderOn' : 'ReminderOff',
          atlasName: 'icons' as Atlas
        }}
        iconColor={COLOR.WHITE}
        fontColor={COLOR.WHITE}
        fontSize={fontSizeSmall}
        backgroundColor={
          attending ? COLOR.BLACK_TRANSPARENT : COLOR.BUTTON_PRIMARY
        }
        uiTransform={{
          ...buttonBaseTransform,
          opacity: toggling ? getLoadingAlphaValue() : 1
        }}
        onMouseDown={toggleReminder}
      />
      {/* Add to calendar */}
      <ButtonTextIcon
        value="ADD TO CALENDAR"
        icon={{ spriteName: 'EventsIcn', atlasName: 'social' }}
        iconColor={COLOR.WHITE}
        fontSize={fontSizeSmall}
        backgroundColor={COLOR.BLACK_TRANSPARENT}
        uiTransform={{
          ...buttonBaseTransform
        }}
        onMouseDown={onAddToCalendar}
      />

      {/* Share */}
      <ShareButton
        fontSize={fontSize}
        fontSizeSmall={fontSizeSmall}
        uiTransform={buttonBaseTransform}
        onShareX={onShareX}
        onCopyLink={() => {
          copyToClipboard({ text: event.url }).catch(console.error)
        }}
      />
    </Row>
  )
}

function ShareButton({
  fontSize,
  fontSizeSmall,
  uiTransform,
  onShareX,
  onCopyLink
}: {
  fontSize: number
  fontSizeSmall: number
  uiTransform?: UiTransformProps
  onShareX: () => void
  onCopyLink: () => void
}): ReactElement {
  const [open, setOpen] = useState<boolean>(false)
  return (
    <UiEntity uiTransform={{ flexDirection: 'column' }}>
      <ButtonTextIcon
        value="SHARE"
        icon={{ spriteName: 'Share', atlasName: 'context' }}
        iconColor={COLOR.WHITE}
        fontSize={fontSizeSmall}
        backgroundColor={open ? COLOR.WHITE_OPACITY_1 : COLOR.BLACK_TRANSPARENT}
        uiTransform={{
          ...uiTransform
        }}
        onMouseDown={() => {
          setOpen(!open)
        }}
      />
      {open && (
        <Column
          uiTransform={{
            positionType: 'absolute',
            position: { top: fontSize * 2.5, right: 0 },
            padding: fontSize * 0.5,
            borderRadius: fontSize / 2,
            alignItems: 'flex-start'
          }}
          uiBackground={{ color: COLOR.BLACK_POPUP_BACKGROUND }}
        >
          <Row
            uiTransform={{
              alignItems: 'center',
              padding: fontSize * 0.3
            }}
            onMouseDown={() => {
              setOpen(false)
              onShareX()
            }}
          >
            <Icon
              icon={{ spriteName: 'Twitter', atlasName: 'social' }}
              iconSize={fontSizeSmall}
              iconColor={COLOR.WHITE}
            />
            <UiEntity
              uiText={{
                value: ' Share on X',
                fontSize: fontSizeSmall,
                color: COLOR.WHITE,
                textWrap: 'nowrap'
              }}
            />
          </Row>
          <Row
            uiTransform={{
              alignItems: 'center',
              padding: fontSize * 0.3
            }}
            onMouseDown={() => {
              setOpen(false)
              onCopyLink()
            }}
          >
            <Icon
              icon={{ spriteName: 'Link', atlasName: 'social' }}
              iconSize={fontSizeSmall}
              iconColor={COLOR.WHITE}
            />
            <UiEntity
              uiText={{
                value: ' Copy link',
                fontSize: fontSizeSmall,
                color: COLOR.WHITE,
                textWrap: 'nowrap'
              }}
            />
          </Row>
        </Column>
      )}
    </UiEntity>
  )
}
