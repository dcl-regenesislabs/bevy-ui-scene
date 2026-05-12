import ReactEcs, { UiEntity } from '@dcl/react-ecs'
import { type Color4 } from '@dcl/sdk/math'
import { executeTask } from '@dcl/sdk/ecs'
import { type Atlas } from '../utils/definitions'
import { type Popup, setLastPopupSubmitting } from './popup-stack'
import { PopupBackdrop } from './popup-backdrop'
import { COLOR } from './color-palette'
import { Column, Row } from './layout'
import Icon from './icon/Icon'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../service/fontsize-system'
import { getContentScaleRatio } from '../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../utils/ui-utils'
import { noop } from '../utils/function-utils'
import { showErrorPopup } from '../service/error-popup-service'
import { store } from '../state/store'
import { closeLastPopupAction, pushPopupAction } from '../state/hud/actions'
import { HUD_POPUP_TYPE } from '../state/hud/state'
import useState = ReactEcs.useState
import ButtonComponent from './button-component'

export type ConfirmPopupIcon = {
  spriteName: string
  atlasName: Atlas
  /** Optional colored circle behind the icon. */
  backgroundColor?: Color4
  /** Icon tint. Defaults to WHITE. */
  iconColor?: Color4
}

/**
 * Payload for `HUD_POPUP_TYPE.CONFIRM`. Prefer the `showConfirmPopup`
 * helper instead of dispatching this directly.
 *
 * Note on `onConfirm`: it's a function held in the (frozen) HUD store. The
 * freeze prevents reassigning popup data, but invoking a function reference
 * is fine — that's how friend popups have always worked.
 */
export type ConfirmPopupData = {
  title: string
  message?: string
  icon?: ConfirmPopupIcon
  /** Defaults to "CONFIRM". */
  confirmLabel?: string
  /** Defaults to "CANCEL". */
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  /**
   * Free-form discriminator — `friend-connectivity-service` filters confirms
   * tagged `'friendship'` to auto-close on unrelated friendship events.
   */
  category?: string
  /** Address this confirm is "about" (used by friendship auto-close). */
  address?: string
}

/** Convenience wrapper around `pushPopupAction(HUD_POPUP_TYPE.CONFIRM, …)`. */
export function showConfirmPopup(data: ConfirmPopupData): void {
  store.dispatch(
    pushPopupAction({
      type: HUD_POPUP_TYPE.CONFIRM,
      data
    })
  )
}

export const ConfirmPopup: Popup = ({ shownPopup }) => {
  const data = shownPopup.data as ConfirmPopupData
  if (data == null) return null

  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const iconSize = fontSize * 4

  const [submitting, setSubmitting] = useState<boolean>(false)

  const onCancel = (): void => {
    if (submitting) return
    store.dispatch(closeLastPopupAction())
  }

  const onConfirm = (): void => {
    if (submitting) return
    setSubmitting(true)
    setLastPopupSubmitting(true)
    executeTask(async () => {
      try {
        await data.onConfirm()
        setLastPopupSubmitting(false)
        store.dispatch(closeLastPopupAction())
      } catch (error) {
        setSubmitting(false)
        setLastPopupSubmitting(false)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'confirmPopup'
        )
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
            variant="subtle"
            onMouseDown={onCancel}
            value={`<b>${data.cancelLabel ?? 'CANCEL'}</b>`}
          />
          <ButtonComponent
            loading={submitting}
            variant="primary"
            onMouseDown={onConfirm}
            value={`<b>${data.confirmLabel ?? 'CONFIRM'}</b>`}
          />
        </Row>
      </Column>
    </PopupBackdrop>
  )
}
