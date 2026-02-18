import ReactEcs, { Button, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { store } from '../../state/store'
import { COLOR } from '../../components/color-palette'
import { closeLastPopupAction } from '../../state/hud/actions'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../utils/ui-utils'
import { noop } from '../../utils/function-utils'
import Icon from '../../components/icon/Icon'
import { Color4 } from '@dcl/sdk/math'
import { type Popup } from '../../components/popup-stack'
import { CopyButton } from '../../components/copy-button'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
const { useState } = ReactEcs

export const ErrorPopup: Popup = ({ shownPopup }) => {
  const error: any = (shownPopup.data as any).error

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        zIndex: 999,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_7
      }}
      onMouseDown={() => {
        closeDialog()
      }}
    >
      <ErrorContent
        error={error}
        source={(shownPopup.data as any)?.source ?? ''}
      />
    </UiEntity>
  )
}

function ErrorContent({
  error,
  source
}: {
  error: unknown
  source: string
}): ReactElement {
  const [errorContent] = useState<string>(
    `<b>Error Details:</b>\n${extractErrorDetails(error)}${
      source.length > 0
        ? `\n\n<b>Source:</b> ${source}\n ${new Error().stack}\n\n`
        : ''
    }`
  )
  const fontSize_title = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const fontSize = getFontSize({
    context: CONTEXT.DIALOG
  })
  return (
    <UiEntity
      uiTransform={{
        width: getContentScaleRatio() * 2400,
        height: getContentScaleRatio() * 1500,
        borderRadius: BORDER_RADIUS_F,
        borderWidth: 0,
        borderColor: COLOR.WHITE,
        alignItems: 'center',
        flexDirection: 'column',
        padding: '1%'
      }}
      onMouseDown={noop}
      uiBackground={{
        color: COLOR.WHITE
      }}
    >
      <Icon
        uiTransform={{
          positionType: 'absolute',
          position: { top: '4%' }
        }}
        icon={{ spriteName: 'BugIcon', atlasName: 'icons' }}
        iconSize={fontSize * 2}
        iconColor={COLOR.RED}
      />

      <UiEntity
        uiTransform={{
          margin: { top: '8%' },
          borderRadius: BORDER_RADIUS_F,
          borderWidth: 0,
          borderColor: COLOR.RED,
          width: '100%',
          height: '60%',
          overflow: 'scroll',
          scrollVisible: 'both'
        }}
      >
        <UiEntity
          uiTransform={{ width: '100%', height: '100%' }}
          uiText={{
            value: errorContent,
            color: COLOR.RED,
            textWrap: 'wrap',
            fontSize: fontSize_title
          }}
        />
      </UiEntity>

      <UiEntity
        uiTransform={{
          position: { left: '0%', top: '5%' },
          alignItems: 'space-between',
          justifyContent: 'center'
        }}
      >
        <Button
          uiTransform={{
            margin: '2%',
            width: getContentScaleRatio() * 400,
            borderRadius: BORDER_RADIUS_F / 2,
            borderWidth: 0,
            borderColor: Color4.White()
          }}
          value={'CLOSE'}
          variant={'secondary'}
          uiBackground={{ color: COLOR.TEXT_COLOR }}
          color={Color4.White()}
          fontSize={fontSize}
          onMouseDown={() => {
            closeDialog()
          }}
        />

        <CopyButton
          fontSize={fontSize * 2}
          text={errorContent}
          elementId={'copy-error-details' + errorContent.length}
          variant={'dark'}
        />
      </UiEntity>
    </UiEntity>
  )

  function extractErrorDetails(error: any): string {
    let message = ''

    if (typeof error === 'string') {
      message = error
    } else if (error instanceof Error || error instanceof Object) {
      message = error.message || error.toString()

      if (error.data) {
        message += `\n\nData:\n${JSON.stringify(error.data, null, 2)}`
      }

      if (error.body) {
        message += `\n\nBody:\n${JSON.stringify(error.body, null, 2)}`
      }

      if (error.response?.data) {
        message += `\n\nResponse data:\n${JSON.stringify(
          error.response.data,
          null,
          2
        )}`
      }

      if (error.stack) {
        message += `\n\nStack:\n${error.stack}`
      }

      return message
    } else if (error && typeof error === 'object') {
      // fallback: dump whole object
      return JSON.stringify(error, null, 2)
    } else {
      return String(error)
    }
    return message
  }
}

function closeDialog(): void {
  store.dispatch(closeLastPopupAction())
}
