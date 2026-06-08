import { getPlacesAroundParcel } from '../../../service/map-places'
import { FOV } from './big-map-view'
import { ReactEcs, type ReactElement, UiEntity } from '@dcl/react-ecs'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { engine, PrimaryPointerInfo, Transform } from '@dcl/sdk/ecs'
import { getBigMapCameraEntity } from '../../../service/map/map-camera'
import { type Vector2, type Vector3 } from '@dcl/sdk/math'
import { screenToGround } from '../../../service/perspective-to-screen'
import { bigMap2DViewport, screenToParcel2D } from './big-map-2d-view'
import {
  getViewportHeight,
  getViewportWidth
} from '../../../service/canvas-ratio'
import { getVector3Parcel } from '../../../service/player-scenes'
import { COLOR } from '../../../components/color-palette'
import {
  currentRealmProviderIsWorld,
  getRealmName
} from '../../../service/realm-change'
import { truncateWithoutBreakingWords } from '../../../utils/ui-utils'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'

export function MapStatusBar({
  fontSize,
  uiTransform
}: {
  fontSize: number
  uiTransform: UiTransformProps
}): ReactElement {
  const [coordsStr, setCoordsStr] = useState<string>('-,-')
  useEffect(() => {
    try {
      const pointerInfo = PrimaryPointerInfo.get(engine.RootEntity)
      const screenCoords = pointerInfo.screenCoordinates as Vector2
      let x: number
      let y: number
      if (bigMap2DViewport.active) {
        const parcel = screenToParcel2D(screenCoords.x, screenCoords.y)
        if (!parcel) return
        x = parcel.x
        y = parcel.y
      } else {
        const mapCameraTransform = Transform.get(getBigMapCameraEntity())
        const targetPosition: Vector3 = screenToGround(
          screenCoords.x,
          screenCoords.y,
          getViewportWidth(),
          getViewportHeight(),
          mapCameraTransform.position,
          mapCameraTransform.rotation,
          FOV
        ) as Vector3
        const parcel = getVector3Parcel(targetPosition)
        x = parcel.x
        y = parcel.y
      }
      const place = getPlacesAroundParcel({ x, y }, 0)
      const parcelName = place[0]?.title ?? ''
      const worldStr = currentRealmProviderIsWorld()
        ? getRealmName()
        : 'Genesis City'

      setCoordsStr(
        `${x},${y}\n<b>${truncateWithoutBreakingWords(
          parcelName.trim() || worldStr,
          24
        )}</b>`
      )
    } catch (error) {}
  })

  return (
    <UiEntity
      uiTransform={{
        justifyContent: 'flex-start',
        alignSelf: 'flex-start',
        ...uiTransform
      }}
      uiText={{
        value: coordsStr,
        color: COLOR.WHITE,
        fontSize,
        textAlign: 'middle-left'
      }}
    />
  )
}
