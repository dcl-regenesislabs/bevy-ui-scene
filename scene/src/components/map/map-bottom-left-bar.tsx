import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getViewportHeight } from '../../service/canvas-ratio'
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import { Column } from '../ui-system/layout'
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
import {
  saveBigMapStyle,
  saveBigMap2DLayer,
  type BigMapStyle,
  type BigMap2DLayer
} from './mini-map-persistence'
import { updateHudStateAction } from '../../state/hud/actions'
import { type AtlasIcon } from '../../utils/definitions'
import { Toggle, ToggleHandler } from '../ui-system/toggle'

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

function requestBigMap2DCenter(worldX: number, worldZ: number): void {
  store.dispatch(
    updateHudStateAction({
      bigMap2DPendingCenter: { x: worldX, z: worldZ, ts: Date.now() }
    })
  )
}

export function MapBottomLeftBar(): ReactElement {
  const bigMapStyle = store.getState().hud.bigMapStyle
  const bigMap2DLayer = store.getState().hud.bigMap2DLayer
  const buttonIconSize = getFontSize({}) * 2
  const is2D = bigMapStyle === '2d'

  return (
    <Column
      uiTransform={{
        positionType: 'absolute',
        position: {
          bottom: getViewportHeight() * 0.05,
          left: 0
        },
        padding: { bottom: '0.5%' },
        zIndex: 1000
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_8
      }}
    >
      <BigMapStyleToggleSwitch bigMapStyle={bigMapStyle} />
      <BigMap2DLayerToggleSwitch
        bigMap2DLayer={bigMap2DLayer}
        disabled={!is2D}
      />

      <IconButton
        icon={{ spriteName: 'top-view', atlasName: 'icons' }}
        iconSize={buttonIconSize}
        disabled={is2D}
        onClick={orbitToTop}
      />
      <IconButton
        icon={{ spriteName: 'bird-view', atlasName: 'icons' }}
        iconSize={buttonIconSize}
        disabled={is2D}
        onClick={orbitToBird}
      />

      {store.getState().hud.homePlace && (
        <IconButton
          icon={{ spriteName: 'HomeSolid', atlasName: 'map2' }}
          iconSize={buttonIconSize}
          onClick={() => {
            const home = store.getState().hud.homePlace
            if (!home) return
            const homePlaceRepresentation = decoratePlaceRepresentation(home)
            if (!homePlaceRepresentation) return
            if (is2D) {
              requestBigMap2DCenter(
                homePlaceRepresentation.centralParcelCoords.x,
                homePlaceRepresentation.centralParcelCoords.z
              )
            } else {
              displaceCamera(homePlaceRepresentation.centralParcelCoords)
            }
          }}
        />
      )}
      <IconButton
        icon={{ spriteName: 'CenterPlayerIcn', atlasName: 'map2' }}
        iconSize={buttonIconSize}
        onClick={() => {
          const playerPosition = Transform.get(engine.PlayerEntity).position
          if (is2D) {
            requestBigMap2DCenter(playerPosition.x, playerPosition.z)
          } else {
            displaceCamera(
              Vector3.create(playerPosition.x, 0, playerPosition.z)
            )
          }
        }}
      />

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

function BigMapStyleToggleSwitch({
  bigMapStyle
}: {
  bigMapStyle: BigMapStyle
}): ReactElement {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })
  const is3D = bigMapStyle === '3d'
  return (
    <UiEntity uiTransform={{ margin: getFontSize({}) / 2 }}>
      <Toggle
        value={is3D}
        fontSize={fontSize}
        orientation={'vertical'}
        onChange={(next) => {
          const nextStyle: BigMapStyle = next ? '3d' : '2d'
          if (nextStyle === bigMapStyle) return
          saveBigMapStyle(nextStyle)
          store.dispatch(updateHudStateAction({ bigMapStyle: nextStyle }))
        }}
      >
        <UiEntity
          uiText={{
            value: is3D ? '<b>2D</b>' : '<b>3D</b>',
            fontSize,
            color: COLOR.WHITE,
            textWrap: 'nowrap',
            textAlign: 'middle-center'
          }}
        />
        <ToggleHandler>
          <UiEntity
            uiText={{
              value: is3D ? '<b>3D</b>' : '<b>2D</b>',
              fontSize,
              textWrap: 'nowrap',
              color: COLOR.TEXT_COLOR,
              textAlign: 'middle-center'
            }}
          />
        </ToggleHandler>
      </Toggle>
    </UiEntity>
  )
}

function BigMap2DLayerToggleSwitch({
  bigMap2DLayer,
  disabled
}: {
  bigMap2DLayer: BigMap2DLayer
  disabled: boolean
}): ReactElement {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })
  const iconSize = fontSize * 1.4
  const isSatellite = bigMap2DLayer === 'satellite'
  const parcelIcon: AtlasIcon = { spriteName: 'Parcels', atlasName: 'icons' }
  const satelliteIcon: AtlasIcon = {
    spriteName: 'Satellite',
    atlasName: 'icons'
  }
  return (
    <UiEntity
      uiTransform={{
        margin: getFontSize({}) / 2,
        opacity: disabled ? 0.4 : 1
      }}
    >
      <Toggle
        orientation={'vertical'}
        value={isSatellite}
        fontSize={fontSize}
        onChange={(next) => {
          if (disabled) return
          const nextLayer: BigMap2DLayer = next ? 'satellite' : 'parcel'
          if (nextLayer === bigMap2DLayer) return
          saveBigMap2DLayer(nextLayer)
          store.dispatch(updateHudStateAction({ bigMap2DLayer: nextLayer }))
        }}
      >
        <Icon
          icon={isSatellite ? parcelIcon : satelliteIcon}
          iconSize={iconSize}
          iconColor={COLOR.WHITE}
        />
        <ToggleHandler>
          <Icon
            icon={isSatellite ? satelliteIcon : parcelIcon}
            iconSize={iconSize}
          />
        </ToggleHandler>
      </Toggle>
    </UiEntity>
  )
}

function IconButton({
  icon,
  iconSize,
  onClick,
  disabled = false
}: {
  icon: AtlasIcon
  iconSize: number
  onClick: () => void
  disabled?: boolean
}): ReactElement {
  return (
    <Column
      uiTransform={{ ...getButtonTransform(), opacity: disabled ? 0.4 : 1 }}
      uiBackground={{ color: COLOR.WHITE }}
      onMouseDown={() => {
        if (disabled) return
        onClick()
      }}
    >
      <Icon
        uiTransform={{ flexShrink: 0 }}
        icon={icon}
        iconSize={iconSize}
        iconColor={COLOR.TEXT_COLOR}
      />
    </Column>
  )
}

export type { BigMapStyle, BigMap2DLayer }
