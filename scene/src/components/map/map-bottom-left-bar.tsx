import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getViewportHeight } from '../../service/canvas-ratio'
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import { Column } from '../ui-system/layout'
import {
  orbitToTop,
  displaceCamera,
  orbitToBird,
  activate3DCameraTransition,
  deactivate3DCameraTransition
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
        padding: { bottom: '0.5%' }
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_8
      }}
    >
      <BigMapStyleButton
        label="2D"
        active={bigMapStyle === '2d'}
        onClick={() => {
          if (bigMapStyle === '2d') return
          saveBigMapStyle('2d')
          store.dispatch(updateHudStateAction({ bigMapStyle: '2d' }))
          deactivate3DCameraTransition()
        }}
      />
      <BigMapStyleButton
        label="3D"
        active={bigMapStyle === '3d'}
        onClick={() => {
          if (bigMapStyle === '3d') return
          saveBigMapStyle('3d')
          store.dispatch(updateHudStateAction({ bigMapStyle: '3d' }))
          activate3DCameraTransition()
        }}
      />
      <BigMap2DLayerToggleRow bigMap2DLayer={bigMap2DLayer} disabled={!is2D} />

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

function BigMap2DLayerToggleRow({
  bigMap2DLayer,
  disabled
}: {
  bigMap2DLayer: BigMap2DLayer
  disabled: boolean
}): ReactElement {
  return (
    <Column>
      <BigMapStyleButton
        label="PA"
        active={bigMap2DLayer === 'parcel'}
        disabled={disabled}
        onClick={() => {
          if (bigMap2DLayer === 'parcel') return
          saveBigMap2DLayer('parcel')
          store.dispatch(updateHudStateAction({ bigMap2DLayer: 'parcel' }))
        }}
      />
      <BigMapStyleButton
        label="SA"
        active={bigMap2DLayer === 'satellite'}
        disabled={disabled}
        onClick={() => {
          if (bigMap2DLayer === 'satellite') return
          saveBigMap2DLayer('satellite')
          store.dispatch(updateHudStateAction({ bigMap2DLayer: 'satellite' }))
        }}
      />
    </Column>
  )
}

function BigMapStyleButton({
  label,
  active,
  onClick,
  disabled = false
}: {
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}): ReactElement {
  const wrapperTransform = getButtonTransform()
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })
  return (
    <Column
      uiTransform={{ ...wrapperTransform, opacity: disabled ? 0.4 : 1 }}
      uiBackground={{ color: active ? COLOR.WHITE : COLOR.DARK_OPACITY_5 }}
      onMouseDown={() => {
        if (disabled) return
        onClick()
      }}
    >
      <UiEntity
        uiTransform={{ width: '100%', height: '100%' }}
        uiText={{
          value: `<b>${label}</b>`,
          fontSize,
          color: active ? COLOR.TEXT_COLOR : COLOR.WHITE,
          textAlign: 'middle-center'
        }}
      />
    </Column>
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
