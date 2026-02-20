import ReactEcs, { Button, type ReactElement } from '@dcl/react-ecs'
import { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { BORDER_RADIUS_F } from '../../../utils/ui-utils'
import Icon from '../../../components/icon/Icon'
import { COLOR } from '../../../components/color-palette'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { noop } from '../../../utils/function-utils'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'

const state: { confirmFn: () => void; shown: boolean } = {
  confirmFn: noop,
  shown: false
}

export function showDeleteOutfitConfirmation(deleteFn: () => void): void {
  state.confirmFn = deleteFn
  state.shown = true
}

function closeDeleteOutfitDialog(): void {
  state.shown = false
  state.confirmFn = noop
}

export function DeleteOutfitDialog(): ReactElement | null {
  if (!state.shown) return null
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
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
        closeDeleteOutfitDialog()
      }}
    >
      <UiEntity
        uiTransform={{
          width: getContentScaleRatio() * 1000,
          height: getContentScaleRatio() * 600,
          borderRadius: BORDER_RADIUS_F,
          borderWidth: 0,
          borderColor: Color4.White(),
          alignItems: 'center',
          flexDirection: 'column',
          padding: '2%'
        }}
        onMouseDown={noop}
        uiBackground={{
          color: Color4.White()
        }}
      >
        <Icon
          icon={{ spriteName: 'delete-outfit-icon', atlasName: 'backpack' }}
          iconSize={getContentScaleRatio() * 96}
        />

        <UiEntity
          uiText={{
            value: '<b>Are you sure you want to delete this outfit?</b>',
            color: COLOR.TEXT_COLOR,
            textWrap: 'wrap',
            fontSize: fontSizeTitle
          }}
          uiTransform={{
            margin: '5%',
            width: '60%'
          }}
        />
        <UiEntity
          uiTransform={{
            position: { left: '-5%', top: '5%' },
            alignItems: 'space-around'
          }}
        >
          <Button
            uiTransform={{
              margin: '5%',
              width: getContentScaleRatio() * 300,
              height: getContentScaleRatio() * 80,
              borderRadius: BORDER_RADIUS_F / 2,
              borderWidth: 0,
              borderColor: Color4.White()
            }}
            value={'NO'}
            variant={'secondary'}
            uiBackground={{ color: COLOR.TEXT_COLOR }}
            color={Color4.White()}
            fontSize={fontSize}
            onMouseDown={() => {
              closeDeleteOutfitDialog()
            }}
          />
          <Button
            uiTransform={{
              margin: '5%',
              width: getContentScaleRatio() * 300,
              height: getContentScaleRatio() * 80,
              borderRadius: BORDER_RADIUS_F / 2,
              borderWidth: 0,
              borderColor: Color4.White()
            }}
            value={'YES'}
            variant={'primary'}
            fontSize={fontSize}
            onMouseUp={() => {
              state.confirmFn() // TODO REVIEW: isn't this an antipattern? a function in state? other way ? use a callback with the info?
              state.shown = false
              state.confirmFn = noop
            }}
          />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
