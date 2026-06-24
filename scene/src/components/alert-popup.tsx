import ReactEcs, { UiEntity } from '@dcl/react-ecs'
import { type Color4 } from '@dcl/sdk/math'
import { type Atlas } from '../utils/definitions'
import { type Popup } from './popup-stack'
import { PopupBackdrop } from './popup-backdrop'
import { COLOR } from './color-palette'
import { Column, Row } from './ui-system/layout'
import Icon from './icon/Icon'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../service/fontsize-system'
import { getContentScaleRatio } from '../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../utils/ui-utils'
import { noop } from '../utils/function-utils'
import { store } from '../state/store'
import { closeLastPopupAction, pushPopupAction } from '../state/hud/actions'
import { HUD_POPUP_TYPE } from '../state/hud/state'
import ButtonComponent from './ui-system/button-component'

export type AlertPopupIcon = {
  spriteName: string
  atlasName: Atlas
  /** Optional colored circle behind the icon. */
  backgroundColor?: Color4
  iconColor?: Color4
}

export type AlertPopupData = {
  title: string
  message?: string
  icon?: AlertPopupIcon
  /** Defaults to "OK". */
  okLabel?: string
}

/** Convenience wrapper around `pushPopupAction(HUD_POPUP_TYPE.ALERT, …)`. */
export function showAlertPopup(data: AlertPopupData): void {
  store.dispatch(
    pushPopupAction({
      type: HUD_POPUP_TYPE.ALERT,
      data
    })
  )
}

/** Single-button informational dialog. The OK button just closes it. */
export const AlertPopup: Popup = ({ shownPopup }) => {
  const data = shownPopup.data as AlertPopupData
  if (data == null) return null

  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const iconSize = fontSize * 4

  const onOk = (): void => {
    store.dispatch(closeLastPopupAction())
  }

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          width: getContentScaleRatio() * 1200,
          borderRadius: BORDER_RADIUS_F,
          padding: {
            top: fontSize * 4,
            bottom: fontSize * 4,
            left: fontSize * 4,
            right: fontSize * 4
          },
          alignItems: 'center'
        }}
        uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
        onMouseDown={noop}
      >
        {data.icon != null && (
          <UiEntity
            uiTransform={{
              width: iconSize,
              height: iconSize,
              justifyContent: 'center',
              alignItems: 'center',
              margin: { bottom: fontSize },
              borderRadius: iconSize / 2
            }}
            uiBackground={
              data.icon.backgroundColor != null
                ? { color: data.icon.backgroundColor }
                : undefined
            }
          >
            <Icon
              icon={{
                spriteName: data.icon.spriteName,
                atlasName: data.icon.atlasName
              }}
              iconSize={iconSize * 0.6}
              iconColor={data.icon.iconColor ?? COLOR.WHITE}
            />
          </UiEntity>
        )}

        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: data.message != null ? fontSize : fontSize * 2 }
          }}
          uiText={{
            value: data.title,
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'middle-center',
            textWrap: 'wrap'
          }}
        />

        {data.message != null && (
          <UiEntity
            uiTransform={{
              width: '100%',
              margin: { bottom: fontSize * 2 }
            }}
            uiText={{
              value: data.message,
              fontSize,
              color: COLOR.TEXT_COLOR_GREY,
              textAlign: 'middle-center',
              textWrap: 'wrap'
            }}
          />
        )}

        <Row childrenGrow childrenGap={fontSize / 2}>
          <ButtonComponent
            variant="primary"
            onMouseDown={onOk}
            value={`<b>${data.okLabel ?? 'OK'}</b>`}
          />
        </Row>
      </Column>
    </PopupBackdrop>
  )
}
