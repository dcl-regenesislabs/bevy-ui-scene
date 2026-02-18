import ReactEcs, { Button, UiEntity } from '@dcl/react-ecs'
import { store } from '../../state/store'
import { COLOR } from '../../components/color-palette'
import { closeLastPopupAction } from '../../state/hud/actions'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../utils/ui-utils'
import { noop } from '../../utils/function-utils'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import Icon from '../../components/icon/Icon'
import { Color4 } from '@dcl/sdk/math'
import { openExternalUrl } from '~system/RestrictedActions'
import { type Popup } from '../../components/popup-stack'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'

export const PopupUrl: Popup = ({ shownPopup }) => {
  const URL: string = shownPopup.data as string
  if (shownPopup?.type !== HUD_POPUP_TYPE.URL) return null
  const fontSize_title = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })

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
      <UiEntity
        uiTransform={{
          width: getContentScaleRatio() * 1200,
          height: getContentScaleRatio() * 750,
          borderRadius: BORDER_RADIUS_F,
          borderWidth: 0,
          borderColor: COLOR.WHITE,
          alignItems: 'center',
          flexDirection: 'column',
          padding: '1%'
        }}
        onMouseDown={noop}
        uiBackground={{
          color: COLOR.URL_POPUP_BACKGROUND
        }}
      >
        <Icon
          uiTransform={{
            positionType: 'absolute',
            position: { top: '4%' }
          }}
          icon={{ spriteName: 'Link', atlasName: 'icons' }}
          iconSize={getContentScaleRatio() * 96}
          iconColor={COLOR.WHITE}
        />

        <UiEntity
          uiText={{
            value: `<b>Are you sure you want to follow this link?</b>\n\nContinuing will open the link in the browser. Make sure it's a website you trust before proceeding.\n\n<b><color=#22B3F6>${URL}</color></b>`,
            color: COLOR.WHITE,
            textWrap: 'wrap',
            fontSize: fontSize_title
          }}
          uiTransform={{
            margin: { top: '8%' },
            borderRadius: BORDER_RADIUS_F,
            borderWidth: 0,
            borderColor: COLOR.RED,
            width: '90%'
          }}
        />
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
            value={'CANCEL'}
            variant={'secondary'}
            uiBackground={{ color: COLOR.TEXT_COLOR }}
            color={Color4.White()}
            fontSize={fontSize}
            onMouseDown={() => {
              closeDialog()
            }}
          />
          <Button
            uiTransform={{
              margin: '2%',
              width: getContentScaleRatio() * 400,
              borderRadius: BORDER_RADIUS_F / 2,
              borderWidth: 0,
              borderColor: Color4.White()
            }}
            value={'CONTINUE'}
            variant={'primary'}
            fontSize={fontSize}
            onMouseUp={() => {
              closeDialog()
              openExternalUrl({ url: URL }).catch(console.error)
            }}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )

  function closeDialog(): void {
    store.dispatch(closeLastPopupAction())
  }
}
