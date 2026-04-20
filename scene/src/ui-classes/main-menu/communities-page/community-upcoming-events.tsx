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
import { fetchCommunityEvents } from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
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
  return (
    <Row
      uiTransform={{
        width: '100%',
        alignItems: 'flex-start',
        margin: { top: fontSize / 2 },
        borderWidth: 1,
        borderColor: COLOR.RED,
        height: thumbHeight
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
          height: thumbHeight,
          borderRadius: fontSize / 2,
          flexShrink: 0,
          margin: { right: fontSize * 0.5 },
          borderWidth: 1,
          borderColor: COLOR.YELLOW
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: event.image }
        }}
      />
      <Column
        uiTransform={{
          flexGrow: 1,
          flexShrink: 1,
          alignItems: 'flex-start'
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
      </Column>
    </Row>
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
