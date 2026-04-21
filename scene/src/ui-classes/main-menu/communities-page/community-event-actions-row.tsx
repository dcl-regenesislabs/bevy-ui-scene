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
import { UiTransformProps } from '@dcl/sdk/react-ecs'

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
    <Row
      uiTransform={{
        alignItems: 'center',
        ...uiTransform
      }}
    >
      {/* REMIND ME */}
      <Row
        uiTransform={{
          borderRadius: fontSize / 2,
          borderWidth: 1,
          borderColor: COLOR.WHITE,
          flexGrow: 0,
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
            spriteName: attending ? 'ReminderOn' : 'ReminderOff',
            atlasName: 'icons' as Atlas
          }}
          iconSize={fontSizeSmall}
          iconColor={COLOR.WHITE}
        />
        <UiEntity
          uiText={{
            value: attending ? '<b>SUBSCRIBED</b>' : '<b>REMIND ME</b>',
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
