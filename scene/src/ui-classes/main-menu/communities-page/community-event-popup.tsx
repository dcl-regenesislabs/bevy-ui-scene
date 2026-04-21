import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Label } from '@dcl/sdk/react-ecs'
import useState = ReactEcs.useState
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { COLOR } from '../../../components/color-palette'
import { Column } from '../../../components/layout'
import { CloseButton } from '../../../components/close-button'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { noop } from '../../../utils/function-utils'
import { store } from '../../../state/store'
import { closeLastPopupAction } from '../../../state/hud/actions'
import type { EventFromApi } from '../../scene-info-card/SceneInfoCard.types'
import { CommunityEventActionsRow } from './community-event-actions-row'
import {
  handleMarkdownLinkClick,
  markdownToUiTextValue
} from '../../../service/markdown'

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

  const cardWidth = fontSize * 36
  const heroHeight = cardWidth * 0.45

  const startAt = event.next_start_at ?? event.start_at

  // Convert markdown only once per popup mount — not on every render — so
  // bevy-explorer doesn't rebuild the text entity (which loses link hit state).
  const [renderedDescription] = useState<string>(
    markdownToUiTextValue(event.description ?? '')
  )

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          width: cardWidth,
          borderRadius: fontSize / 2,
          padding: 0,
          alignItems: 'flex-start'
        }}
        uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
        onMouseDown={noop}
      >
        <CloseButton
          uiTransform={{
            position: { top: fontSize, right: fontSize },
            positionType: 'absolute',
            zIndex: 1
          }}
          fontSize={fontSize}
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
        <Column
          uiTransform={{
            width: '100%',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            positionType: 'absolute',
            position: { top: 0 },
            height: heroHeight
          }}
        >
          <Column
            uiTransform={{ width: '100%' }}
            uiBackground={{ color: COLOR.DARK_OPACITY_8 }}
          >
            {/* Date */}
            <UiEntity
              uiTransform={{
                width: '100%',
                margin: { left: fontSize / 2 },
                height: fontSize
              }}
              uiText={{
                value: `<b>${formatEventStart(startAt)}</b>`,
                fontSize: fontSizeSmall,
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                textAlign: 'top-left'
              }}
            />

            {/* Title */}
            <UiEntity
              uiTransform={{
                width: '100%',
                padding: 0,
                margin: { top: -fontSize / 2, bottom: -fontSizeTitle / 2 }
              }}
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
                uiTransform={{
                  width: '100%',
                  margin: { left: fontSize / 2 }
                }}
                uiText={{
                  value: `Hosted by <b>${event.user_name}</b>`,
                  fontSize: fontSizeSmall,
                  color: COLOR.TEXT_COLOR_LIGHT_GREY,
                  textAlign: 'top-left'
                }}
              />
            )}
            {/* Actions row */}
            <CommunityEventActionsRow
              event={event}
              uiTransform={{
                margin: {
                  left: fontSize,
                  top: fontSize / 2
                },
                padding: { bottom: -fontSize / 2 }
              }}
            />
          </Column>
        </Column>
        <Column
          uiTransform={{
            width: '100%',
            alignItems: 'flex-start',
            padding: fontSize
          }}
        >
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
              height: fontSize * 32
            }}
          >
            <Label
              uiTransform={{ width: '100%' }}
              value={renderedDescription}
              fontSize={fontSizeSmall}
              color={COLOR.TEXT_COLOR_WHITE}
              textAlign="top-left"
              textWrap="wrap"
              onMouseDown={handleMarkdownLinkClick}
            />
          </Column>
        </Column>
      </Column>
    </PopupBackdrop>
  )
}
