import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import type { EventFromApi } from '../../scene-info-card/SceneInfoCard.types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { executeTask } from '@dcl/sdk/ecs'
import {
  fetchCommunityEvents,
  updateCachedCommunityEvent
} from '../../../utils/communities-promise-utils'
import { createAttendee, removeAttendee } from '../../../utils/promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { ButtonTextIcon } from '../../../components/button-text-icon'
import Icon from '../../../components/icon/Icon'
import { copyToClipboard, openExternalUrl } from '~system/RestrictedActions'
import { showErrorPopup } from '../../../service/error-popup-service'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { truncateWithoutBreakingWords } from '../../../utils/ui-utils'

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

function EventItem({
  event
}: {
  event: EventFromApi
  key: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const startAt = event.next_start_at ?? event.start_at
  const thumbHeight = fontSize * 6 - fontSize / 2

  const [attending, setAttending] = useState<boolean>(event.attending ?? false)
  const [toggling, setToggling] = useState<boolean>(false)
  const [shareOpen, setShareOpen] = useState<boolean>(false)

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

  const onShareX = (): void => {
    const text = `Check out "${event.name}" \n\n An event in @Decentraland!\n\n`
    const url = event.url ?? ''
    void openExternalUrl({
      url: `https://x.com/intent/post?text=${encodeURIComponent(
        text
      )}&hashtags=DCLEvent&url=${encodeURIComponent(url)}`
    })
  }

  const onCopyLink = (): void => {
    copyToClipboard({ text: event.url ?? '' }).catch(console.error)
  }

  return (
    <Row
      uiTransform={{
        width: '100%',
        alignItems: 'flex-start',
        padding: { left: fontSize / 2, right: fontSize / 2, top: fontSize / 2 },
        margin: { bottom: fontSize / 2, top: fontSize / 2 },
        zIndex: shareOpen ? 10 : 0,
        height: fontSize * 13
      }}
      onMouseDown={() => {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.COMMUNITY_EVENT_INFO,
            data: event
          })
        )
      }}
    >
      <UiEntity
        uiTransform={{
          width: thumbHeight * 1.5,
          height: thumbHeight - fontSize,
          borderRadius: fontSize / 2,
          flexShrink: 0,
          flexGrow: 0,
          margin: { right: fontSize * 0.5 }
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: event.image }
        }}
      />
      <Column
        uiTransform={{
          flexGrow: 1,
          flexShrink: 0,
          alignItems: 'flex-start',
          margin: { top: -fontSize / 2 }
        }}
      >
        <UiEntity
          uiTransform={{ width: '100%' }}
          uiText={{
            value: `<b>${formatEventStart(startAt)}</b>`,
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_LIGHT_GREY,
            textAlign: 'top-left'
          }}
        />
        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { top: -fontSizeSmall / 2 },
            padding: 0
          }}
          uiText={{
            value: `<b>${truncateWithoutBreakingWords(event.name, 55)}</b>`,
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'top-left',
            textWrap: 'wrap'
          }}
        />
        <Row
          uiTransform={{
            alignItems: 'center'
          }}
        >
          <ButtonTextIcon
            variant="transparent"
            value={attending ? '<b>SUBSCRIBED</b>' : '<b>REMIND ME</b>'}
            icon={{
              spriteName: attending ? 'ReminderOn' : 'ReminderOff',
              atlasName: 'icons'
            }}
            fontSize={fontSizeSmall}
            loading={toggling}
            uiTransform={{
              borderRadius: fontSize / 2,
              padding: {
                left: fontSize * 0.5,
                right: fontSize * 0.6,
                top: fontSize * 0.2,
                bottom: fontSize * 0.2
              },
              margin: { right: fontSize * 0.5 },
              flexGrow: 0,
              width: 'auto'
            }}
            onMouseDown={toggleReminder}
          />
          <CompactShareButton
            fontSize={fontSize}
            fontSizeSmall={fontSizeSmall}
            open={shareOpen}
            setOpen={setShareOpen}
            onShareX={onShareX}
            onCopyLink={onCopyLink}
          />
        </Row>
      </Column>
    </Row>
  )
}

function CompactShareButton({
  fontSize,
  fontSizeSmall,
  open,
  setOpen,
  onShareX,
  onCopyLink
}: {
  fontSize: number
  fontSizeSmall: number
  open: boolean
  setOpen: (next: boolean) => void
  onShareX: () => void
  onCopyLink: () => void
}): ReactElement {
  const size = fontSize * 1.8
  return (
    <UiEntity uiTransform={{ flexDirection: 'column' }}>
      <UiEntity
        uiTransform={{
          width: size,
          height: size,
          borderRadius: fontSize / 2,
          justifyContent: 'center',
          alignItems: 'center'
        }}
        uiBackground={{
          color: open ? COLOR.WHITE_OPACITY_1 : COLOR.WHITE_OPACITY_0
        }}
        onMouseDown={() => {
          setOpen(!open)
        }}
      >
        <Icon
          icon={{ spriteName: 'Share', atlasName: 'context' }}
          iconSize={fontSizeSmall}
          iconColor={COLOR.WHITE}
        />
      </UiEntity>
      {open && (
        <Column
          uiTransform={{
            positionType: 'absolute',
            position: { top: size + fontSize * 0.2, right: 0 },
            padding: fontSize * 0.5,
            borderRadius: fontSize / 2,
            alignItems: 'flex-start',
            zIndex: 1
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

function Header({ fontSize }: { fontSize: number }): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        margin: { bottom: fontSize * 0.5 }
      }}
      uiText={{
        value: '<b>Upcoming Events</b>',
        fontSize,
        color: COLOR.TEXT_COLOR_WHITE,
        textAlign: 'top-left'
      }}
    />
  )
}

export function CommunityUpcomingEvents({
  communityId
}: {
  communityId: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const scale = getContentScaleRatio()
  const [events, setEvents] = useState<EventFromApi[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      try {
        const result = await fetchCommunityEvents(communityId, 20)
        setEvents(result)
      } catch (error) {
        console.error('[communities] failed to load events', error)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <Column
        uiTransform={{
          width: '100%',
          padding: fontSize,
          alignItems: 'flex-start'
        }}
      >
        <Header fontSize={fontSizeTitle} />
        {Array.from({ length: 3 }).map((_, i) => (
          <UiEntity
            key={i}
            uiTransform={{
              width: '100%',
              height: scale * 120,
              margin: { bottom: fontSize * 0.5 }
            }}
          >
            <LoadingPlaceholder
              uiTransform={{
                width: '100%',
                height: '100%',
                borderRadius: fontSize / 2
              }}
            />
          </UiEntity>
        ))}
      </Column>
    )
  }

  if (events.length === 0) {
    return (
      <Column
        uiTransform={{
          width: '100%',
          padding: fontSize,
          alignItems: 'flex-start'
        }}
      >
        <Header fontSize={fontSizeTitle} />
        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { top: fontSize * 4 },
            justifyContent: 'center'
          }}
          uiText={{
            value: 'No Upcoming Events',
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_LIGHT_GREY,
            textAlign: 'middle-center'
          }}
        />
      </Column>
    )
  }

  return (
    <Column
      uiTransform={{
        width: '100%',
        padding: fontSize,
        alignItems: 'flex-start'
      }}
    >
      <Header fontSize={fontSizeTitle} />
      {events.map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
    </Column>
  )
}
