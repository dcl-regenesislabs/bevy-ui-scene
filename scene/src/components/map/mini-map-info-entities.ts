import {
  CameraLayers,
  engine,
  type Entity,
  Material,
  MeshRenderer,
  TextAlignMode,
  TextShape,
  Transform
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { COLOR } from '../color-palette'
import {
  fromParcelCoordsToPosition,
  type Place
} from '../../service/map-places'
import { wrapText } from './mini-map-label-text'
import { getMapInfoCamera } from './mini-map-camera'

const placeEntities: Entity[] = []
const avatarSymbolEntities: Array<{
  avatarSymbolEntity: Entity
  playerEntity: Entity
}> = []

const infoEntity: Entity = engine.addEntity()
const PLAYER_SYMBOL_SIZE = 16
const POI_SYMBOL_SIZE = 24
const MAP_PLAYER_SRC = `assets/images/map/MapPlayer.png`
const POI_SRC = `assets/images/map/POI.png`
const MAP_LABEL_FONTSIZE = 250
const MAP_LABEL_Y_OFFSET = -12
CameraLayers.create(infoEntity, {
  layers: [10]
})

export function applyRotation(dg: number): void {
  placeEntities.forEach((entity): void => {
    const placeEntityTransform = Transform.getMutableOrNull(entity)
    if (placeEntityTransform) {
      Object.assign(
        placeEntityTransform.rotation,
        Quaternion.fromEulerDegrees(90, dg, 0)
      )
    }
  })
}

export function updatePlayerSymbolPositions(): void {
  avatarSymbolEntities.forEach(({ avatarSymbolEntity, playerEntity }): void => {
    const playerEntityTransform = Transform.getOrNull(playerEntity)
    const mutableAvatarSymbolTransform =
      Transform.getMutableOrNull(avatarSymbolEntity)
    if (!playerEntityTransform || !mutableAvatarSymbolTransform) return
    mutableAvatarSymbolTransform.position.x = playerEntityTransform.position.x
    mutableAvatarSymbolTransform.position.z = playerEntityTransform.position.z
  })
}

export function renderMinimapPlayers(playerEntities: Entity[]): void {
  avatarSymbolEntities.forEach((avatarEntities) => {
    engine.removeEntityWithChildren(avatarEntities.avatarSymbolEntity)
  })
  avatarSymbolEntities.splice(0, avatarSymbolEntities.length)

  playerEntities.forEach((playerEntity: Entity, index): void => {
    const avatarSymbolEntity = engine.addEntity()
    avatarSymbolEntities.push({ avatarSymbolEntity, playerEntity })
    const playerEntityTransform = Transform.getMutableOrNull(playerEntity)
    Transform.create(avatarSymbolEntity, {
      position: Vector3.create(
        playerEntityTransform?.position.x,
        Transform.get(getMapInfoCamera()).position.y - 1,
        playerEntityTransform?.position.z
      ),
      scale: Vector3.create(
        PLAYER_SYMBOL_SIZE,
        PLAYER_SYMBOL_SIZE,
        PLAYER_SYMBOL_SIZE
      ),
      rotation: Quaternion.fromEulerDegrees(90, 0, 0),
      parent: infoEntity
    })
    MeshRenderer.setPlane(avatarSymbolEntity)
    Material.setPbrMaterial(avatarSymbolEntity, {
      texture: Material.Texture.Common({
        src: MAP_PLAYER_SRC
      }),
      alphaTest: 1
    })
  })
}

export function renderVisiblePlaces(places: Place[]): void {
  placeEntities.forEach((placeEntity) => {
    engine.removeEntityWithChildren(placeEntity)
  })
  placeEntities.splice(0, placeEntities.length)
  const symbolHeight = Transform.get(getMapInfoCamera()).position.y - 1
  places.forEach((place) => {
    const placeEntity = engine.addEntity()
    placeEntities.push(placeEntity)

    const centralParcel = getCentralParcel(place.positions ?? [])
    const [x, y] = (centralParcel ?? '10,10').split(',').map((s) => Number(s))
    const wrappedText = wrapText(place.title)
    const linesMaxChars = wrappedText
      .split('\n')
      .reduce(
        (acc, currentValue: string) => Math.max(acc, currentValue.length),
        0
      )

    Transform.create(placeEntity, {
      position: fromParcelCoordsToPosition(
        { x, y },
        {
          height: symbolHeight
        }
      ),
      rotation: Quaternion.fromEulerDegrees(90, 0, 0),
      parent: infoEntity
    })

    const symbolEntity = engine.addEntity()

    Transform.create(symbolEntity, {
      parent: placeEntity,
      scale: Vector3.create(POI_SYMBOL_SIZE, POI_SYMBOL_SIZE, POI_SYMBOL_SIZE)
    })

    MeshRenderer.setPlane(symbolEntity)

    Material.setPbrMaterial(symbolEntity, {
      emissiveTexture: Material.Texture.Common({
        src: POI_SRC
      }),
      emissiveColor: COLOR.BLACK,
      texture: Material.Texture.Common({
        src: POI_SRC
      }),
      alphaTest: 1
    })

    const labelEntity = engine.addEntity()
    TextShape.create(labelEntity, {
      text: `<b>${wrappedText}</b>`,
      fontSize: MAP_LABEL_FONTSIZE,
      textColor: COLOR.WHITE,
      textAlign: TextAlignMode.TAM_TOP_CENTER
    })

    Transform.create(labelEntity, {
      parent: placeEntity,
      position: Vector3.create(0, MAP_LABEL_Y_OFFSET, 0)
    })

    const shadowBoxEntity = engine.addEntity()

    MeshRenderer.setPlane(shadowBoxEntity)
    const textHeight = wrappedText.split('\n').length * 24
    Transform.create(shadowBoxEntity, {
      parent: labelEntity,
      position: Vector3.create(0, -textHeight / 2, 0),
      scale: Vector3.create(linesMaxChars * 10 + 4, textHeight, 10)
    })
    Material.setBasicMaterial(shadowBoxEntity, {
      diffuseColor: COLOR.DARK_OPACITY_2,
      castShadows: false
    })
  })
}

export function getCentralParcel(parcelStrings: string[]): string | null {
  if (parcelStrings.length === 0) return null

  // Convertir "x,y" a objetos { x, y }
  const parcels = parcelStrings.map((str) => {
    const [x, y] = str.split(',').map(Number)
    return { x, y }
  })

  // Calcular centroide
  const avgX = parcels.reduce((sum, p) => sum + p.x, 0) / parcels.length
  const avgY = parcels.reduce((sum, p) => sum + p.y, 0) / parcels.length

  // Encontrar la parcela más cercana al centroide
  const centralParcel = parcels.reduce((closest, p) => {
    const dist = Math.hypot(p.x - avgX, p.y - avgY)
    const closestDist = Math.hypot(closest.x - avgX, closest.y - avgY)
    return dist < closestDist ? p : closest
  })

  return `${centralParcel.x},${centralParcel.y}`
}
