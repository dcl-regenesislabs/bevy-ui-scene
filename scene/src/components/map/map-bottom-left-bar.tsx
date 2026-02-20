import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getViewportHeight } from '../../service/canvas-ratio'
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import { Column } from '../layout'
import {
  orbitToTop,
  displaceCamera,
  orbitToBird
} from '../../service/map/map-camera'
import { Vector3 } from '@dcl/sdk/math'
import { engine, Transform } from '@dcl/sdk/ecs'
import { getPlayerParcel } from '../../service/player-scenes'
import { store } from '../../state/store'
import { decoratePlaceRepresentation } from '../../ui-classes/main-hud/big-map/place-decoration'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'

const getButtonTransform = (): UiTransformProps => ({
  borderRadius: getFontSize({}) / 2,
  width: getFontSize({}) * 2,
  height: getFontSize({}) * 2,
  margin: getFontSize({}) / 2,
  borderColor: COLOR.WHITE,
  borderWidth: 0,
  alignItems: 'center',
  justifyContent: 'center'
})
export function MapBottomLeftBar(): ReactElement {
  const buttonWrapperTransform = getButtonTransform()
  const buttonIconSize = getFontSize({}) * 2
  return (
    <Column
      uiTransform={{
        positionType: 'absolute',
        position: {
          bottom: getViewportHeight() * 0.05,
          left: 0
        },
        padding: { bottom: '0.5%' }
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_8
      }}
    >
      <Column
        uiTransform={buttonWrapperTransform}
        uiBackground={{
          color: COLOR.WHITE
        }}
        onMouseDown={orbitToTop}
      >
        <Icon
          uiTransform={{
            flexShrink: 0
          }}
          icon={{ spriteName: 'top-view', atlasName: 'icons' }}
          iconSize={buttonIconSize}
          iconColor={COLOR.TEXT_COLOR}
        />
      </Column>
      <Column
        uiTransform={buttonWrapperTransform}
        uiBackground={{
          color: COLOR.WHITE
        }}
        onMouseDown={orbitToBird}
      >
        <Icon
          uiTransform={{
            flexShrink: 0
          }}
          icon={{ spriteName: 'bird-view', atlasName: 'icons' }}
          iconSize={buttonIconSize}
          iconColor={COLOR.TEXT_COLOR}
        />
      </Column>
      {store.getState().hud.homePlace && (
        <Column
          uiTransform={buttonWrapperTransform}
          uiBackground={{
            color: COLOR.WHITE
          }}
          onMouseDown={() => {
            const homePlaceRepresentation = decoratePlaceRepresentation(
              store.getState().hud.homePlace
            )
            if (homePlaceRepresentation)
              displaceCamera(homePlaceRepresentation.centralParcelCoords)
          }}
        >
          <Icon
            uiTransform={{
              flexShrink: 0
            }}
            icon={{ spriteName: 'HomeSolid', atlasName: 'map2' }}
            iconSize={buttonIconSize}
            iconColor={COLOR.TEXT_COLOR}
          />
        </Column>
      )}

      <Column
        uiTransform={buttonWrapperTransform}
        uiBackground={{
          color: COLOR.WHITE
        }}
        onMouseDown={() => {
          const playerPosition = Transform.get(engine.PlayerEntity).position

          displaceCamera(Vector3.create(playerPosition.x, 0, playerPosition.z))
        }}
      >
        <Icon
          uiTransform={{
            flexShrink: 0
          }}
          icon={{ spriteName: 'CenterPlayerIcn', atlasName: 'map2' }}
          iconSize={buttonIconSize}
          iconColor={COLOR.TEXT_COLOR}
        />
      </Column>
      <UiEntity
        uiTransform={{
          width: '100%',
          positionType: 'absolute',
          position: {
            bottom: -getFontSize({ token: TYPOGRAPHY_TOKENS.CAPTION_S_BOTTOM })
          }
        }}
        uiText={{
          value: `${getPlayerParcel().x},${getPlayerParcel().y}`,
          color: COLOR.WHITE,
          textWrap: 'nowrap',
          fontSize: getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })
        }}
      />
    </Column>
  )
}
