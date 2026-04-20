import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { CloseButton } from '../../../components/close-button'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { BORDER_RADIUS_F } from '../../../utils/ui-utils'
import { noop } from '../../../utils/function-utils'
import { store } from '../../../state/store'
import { closeLastPopupAction } from '../../../state/hud/actions'
import Icon from '../../../components/icon/Icon'
import type { EventFromApi } from '../../scene-info-card/SceneInfoCard.types'
import { createAttendee, removeAttendee } from '../../../utils/promise-utils'
import { executeTask } from '@dcl/sdk/ecs'
import { copyToClipboard, openExternalUrl } from '~system/RestrictedActions'
import { showErrorPopup } from '../../../service/error-popup-service'
import type { Atlas } from '../../../utils/definitions'
import useState = ReactEcs.useState

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC'
]

function formatEventStart(startAt: string): string {
  try {
    const d = new Date(startAt)
    const day = DAYS[d.getDay()]
    const month = MONTHS[d.getMonth()]
    const date = d.getDate()
    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    if (hours === 0) hours = 12
    return `${day}, ${month} ${date} @ ${hours}:${minutes}${ampm}`
  } catch {
    return startAt
  }
}

/** Format ISO timestamp as YYYYMMDDTHHmmssZ (Google Calendar format). */
function toCalendarDate(iso: string): string {
  return iso.replace(/[-:.]/g, '').replace(/\.\d+Z$/, 'Z')
}

export const CommunityEventPopup: Popup = ({ shownPopup }) => {
  const event = shownPopup.data as EventFromApi
  if (event == null) return null
  return <CommunityEventPopupContent event={event} />
}

function CommunityEventPopupContent({
  event
}: {
  event: EventFromApi
}): ReactElement {
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
  const scale = getContentScaleRatio()
  const cardWidth = scale * 900
  const heroHeight = cardWidth * 0.45

  const [attending, setAttending] = useState<boolean>(event.attending ?? false)
  const [toggling, setToggling] = useState<boolean>(false)

  const startAt = event.next_start_at ?? event.start_at
  const finishAt = event.next_finish_at ?? event.finish_at

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
        event.attending = next
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
    const text = `Check out ${event.name}, an event in Decentraland!`
    const url = event.url ?? ''
    void openExternalUrl({
      url: `https://x.com/intent/post?text=${encodeURIComponent(
        text
      )}&hashtags=DCLEvent&url=${encodeURIComponent(url)}`
    })
  }

  const onCopyLink = (): void => {
    const text = `Check out ${event.name}, an event in Decentraland! ${
      event.url ?? ''
    } #DCLEvent`
    copyToClipboard({ text }).catch(console.error)
  }

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          width: cardWidth,
          borderRadius: BORDER_RADIUS_F,
          padding: fontSize * 1.5,
          alignItems: 'flex-start'
        }}
        uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
        onMouseDown={noop}
      >
        <CloseButton
          uiTransform={{
            position: { top: fontSize, right: fontSize },
            positionType: 'absolute'
          }}
          onClick={() => {
            store.dispatch(closeLastPopupAction())
          }}
        />

        {/* Hero image */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: heroHeight,
            borderRadius: fontSize,
            flexShrink: 0,
            margin: { bottom: fontSize }
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: event.image }
          }}
        />

        {/* Date */}
        <UiEntity
          uiTransform={{ width: '100%', margin: { bottom: fontSize * 0.3 } }}
          uiText={{
            value: formatEventStart(startAt),
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_LIGHT_GREY,
            textAlign: 'top-left'
          }}
        />

        {/* Title */}
        <UiEntity
          uiTransform={{ width: '100%', margin: { bottom: fontSize * 0.3 } }}
          uiText={{
            value: `<b>${event.name}</b>`,
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'top-left',
            textWrap: 'wrap'
          }}
        />

        {/* Hosted by */}
        {event.user_name != null && event.user_name.length > 0 && (
          <UiEntity
            uiTransform={{ width: '100%', margin: { bottom: fontSize } }}
            uiText={{
              value: `Hosted by <b>${event.user_name}</b>`,
              fontSize: fontSizeSmall,
              color: COLOR.TEXT_COLOR_LIGHT_GREY,
              textAlign: 'top-left'
            }}
          />
        )}

        {/* Actions row */}
        <Row
          uiTransform={{
            alignItems: 'center',
            margin: { bottom: fontSize }
          }}
        >
          {/* REMIND ME */}
          <Row
            uiTransform={{
              borderRadius: fontSize / 2,
              borderWidth: 1,
              borderColor: COLOR.WHITE,
              padding: {
                left: fontSize * 0.6,
                right: fontSize * 0.8,
                top: fontSize * 0.3,
                bottom: fontSize * 0.3
              },
              alignItems: 'center',
              margin: { right: fontSize * 0.5 },
              opacity: toggling ? getLoadingAlphaValue() : 1
            }}
            uiBackground={{
              color: attending ? COLOR.BUTTON_PRIMARY : COLOR.BLACK_TRANSPARENT
            }}
            onMouseDown={toggleReminder}
          >
            <Icon
              icon={{
                spriteName: attending ? 'Discord' : 'Discord',
                atlasName: 'social' as Atlas
              }}
              iconSize={fontSizeSmall}
              iconColor={COLOR.WHITE}
            />
            <UiEntity
              uiText={{
                value: '<b>REMIND ME</b>',
                fontSize: fontSizeSmall,
                color: COLOR.WHITE,
                textWrap: 'nowrap'
              }}
            />
          </Row>

          {/* Add to calendar */}
          <IconActionButton
            fontSize={fontSize}
            spriteName="CalendarIcn"
            atlasName="icons"
            onClick={onAddToCalendar}
          />

          {/* Share */}
          <ShareButton
            fontSize={fontSize}
            onShareX={onShareX}
            onCopyLink={onCopyLink}
          />
        </Row>

        {/* Description */}
        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize * 0.3 }
          }}
          uiText={{
            value: '<b>DESCRIPTION</b>',
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_LIGHT_GREY,
            textAlign: 'top-left'
          }}
        />
        <Column
          uiTransform={{
            width: '100%',
            height: scale * 220,
            overflow: 'scroll',
            scrollVisible: 'vertical'
          }}
        >
          <UiEntity
            uiTransform={{ width: '100%' }}
            uiText={{
              value: event.description ?? '',
              fontSize: fontSizeCaption,
              color: COLOR.TEXT_COLOR_WHITE,
              textAlign: 'top-left',
              textWrap: 'wrap'
            }}
          />
        </Column>
      </Column>
    </PopupBackdrop>
  )
}

function IconActionButton({
  fontSize,
  spriteName,
  atlasName,
  onClick
}: {
  fontSize: number
  spriteName: string
  atlasName: Atlas
  onClick: () => void
}): ReactElement {
  const size = fontSize * 2.2
  return (
    <UiEntity
      uiTransform={{
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center',
        margin: { right: fontSize * 0.3 },
        borderWidth: 1,
        borderColor: COLOR.WHITE
      }}
      uiBackground={{ color: COLOR.BLACK_TRANSPARENT }}
      onMouseDown={onClick}
    >
      <Icon
        icon={{ spriteName, atlasName }}
        iconSize={fontSize}
        iconColor={COLOR.WHITE}
      />
    </UiEntity>
  )
}

function ShareButton({
  fontSize,
  onShareX,
  onCopyLink
}: {
  fontSize: number
  onShareX: () => void
  onCopyLink: () => void
}): ReactElement {
  const [open, setOpen] = useState<boolean>(false)
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const size = fontSize * 2.2
  return (
    <UiEntity uiTransform={{ flexDirection: 'column' }}>
      <UiEntity
        uiTransform={{
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: COLOR.WHITE
        }}
        uiBackground={{
          color: open ? COLOR.WHITE_OPACITY_1 : COLOR.BLACK_TRANSPARENT
        }}
        onMouseDown={() => {
          setOpen(!open)
        }}
      >
        <Icon
          icon={{ spriteName: 'Share', atlasName: 'context' }}
          iconSize={fontSize}
          iconColor={COLOR.WHITE}
        />
      </UiEntity>
      {open && (
        <Column
          uiTransform={{
            positionType: 'absolute',
            position: { top: size + fontSize * 0.3, right: 0 },
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
