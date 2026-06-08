export type MinimapStyle = 'parcel' | 'satellite' | 'imposters'

export const PARCEL_METERS = 16

export type TileInfo = {
  imageMeters: number
  centerWorldX: number
  centerWorldZ: number
  url: string
}

const PARCEL_SNAP_CHUNK = 16

const PARCEL_IMAGE_PARCELS = 48
const PARCEL_PX_PER_PARCEL = 16

const SATELLITE_CHUNK_PARCELS = 40
const SATELLITE_GRID_SIZE = 8
const SATELLITE_TILE_00_CENTER_PARCEL_X = -133
const SATELLITE_TILE_00_CENTER_PARCEL_Y = 132

function parcelToSatelliteChunk(
  parcelX: number,
  parcelY: number
): { cx: number; cy: number } {
  const cx = Math.floor(
    (parcelX -
      (SATELLITE_TILE_00_CENTER_PARCEL_X - SATELLITE_CHUNK_PARCELS / 2)) /
      SATELLITE_CHUNK_PARCELS
  )
  const cy = Math.floor(
    (SATELLITE_TILE_00_CENTER_PARCEL_Y +
      SATELLITE_CHUNK_PARCELS / 2 -
      1 -
      parcelY) /
      SATELLITE_CHUNK_PARCELS
  )
  return { cx, cy }
}

export function chunkForParcel(
  style: MinimapStyle,
  parcelX: number,
  parcelY: number
): { cx: number; cy: number } {
  if (style === 'satellite') return parcelToSatelliteChunk(parcelX, parcelY)
  return {
    cx: Math.floor(parcelX / PARCEL_SNAP_CHUNK),
    cy: Math.floor(parcelY / PARCEL_SNAP_CHUNK)
  }
}

function isValidSatelliteChunk(cx: number, cy: number): boolean {
  return (
    cx >= 0 && cx < SATELLITE_GRID_SIZE && cy >= 0 && cy < SATELLITE_GRID_SIZE
  )
}

export function tileInfoForChunk(
  style: MinimapStyle,
  cx: number,
  cy: number
): TileInfo | null {
  if (style === 'satellite') {
    if (!isValidSatelliteChunk(cx, cy)) return null
    const centerParcelX =
      SATELLITE_TILE_00_CENTER_PARCEL_X + cx * SATELLITE_CHUNK_PARCELS
    const centerParcelY =
      SATELLITE_TILE_00_CENTER_PARCEL_Y - cy * SATELLITE_CHUNK_PARCELS
    return {
      imageMeters: SATELLITE_CHUNK_PARCELS * PARCEL_METERS,
      centerWorldX: centerParcelX * PARCEL_METERS + PARCEL_METERS,
      centerWorldZ: centerParcelY * PARCEL_METERS + PARCEL_METERS,
      url: `https://media.githubusercontent.com/media/genesis-city/parcels/new-client-images/maps/lod-0/3/${cx}%2C${cy}.jpg`
    }
  }
  const centerParcelX = cx * PARCEL_SNAP_CHUNK + PARCEL_SNAP_CHUNK / 2
  const centerParcelY = cy * PARCEL_SNAP_CHUNK + PARCEL_SNAP_CHUNK / 2
  const imagePx = PARCEL_IMAGE_PARCELS * PARCEL_PX_PER_PARCEL
  return {
    imageMeters: PARCEL_IMAGE_PARCELS * PARCEL_METERS,
    centerWorldX: centerParcelX * PARCEL_METERS + PARCEL_METERS / 2,
    centerWorldZ: centerParcelY * PARCEL_METERS + PARCEL_METERS / 2,
    url: `https://api.decentraland.org/v1/map.png?center=${centerParcelX},${centerParcelY}&width=${imagePx}&height=${imagePx}&size=${PARCEL_PX_PER_PARCEL}`
  }
}

export function getTileInfo(
  style: MinimapStyle,
  playerParcelX: number,
  playerParcelY: number
): TileInfo | null {
  const { cx, cy } = chunkForParcel(style, playerParcelX, playerParcelY)
  return tileInfoForChunk(style, cx, cy)
}

export function getPrefetchTiles(
  style: MinimapStyle,
  playerParcelX: number,
  playerParcelY: number,
  dirX: -1 | 0 | 1,
  dirZ: -1 | 0 | 1
): TileInfo[] {
  if (dirX === 0 && dirZ === 0) return []
  const { cx, cy } = chunkForParcel(style, playerParcelX, playerParcelY)
  const dirCy = style === 'satellite' ? -dirZ : dirZ
  const tiles: Array<TileInfo | null> = []
  if (dirX !== 0) tiles.push(tileInfoForChunk(style, cx + dirX, cy))
  if (dirCy !== 0) tiles.push(tileInfoForChunk(style, cx, cy + dirCy))
  if (dirX !== 0 && dirCy !== 0)
    tiles.push(tileInfoForChunk(style, cx + dirX, cy + dirCy))
  return tiles.filter((t): t is TileInfo => t !== null)
}

export function worldToScreen2D(
  wx: number,
  wz: number,
  playerX: number,
  playerZ: number,
  yawRad: number,
  pxPerMeter: number,
  mapCenter: number
): { x: number; y: number } {
  const dx = (wx - playerX) * pxPerMeter
  const dz = (wz - playerZ) * pxPerMeter
  const c = Math.cos(yawRad)
  const s = Math.sin(yawRad)
  return {
    x: mapCenter + dx * c - dz * s,
    y: mapCenter - (dx * s + dz * c)
  }
}

export function buildMinimapUvs(
  playerWorldX: number,
  playerWorldZ: number,
  tile: TileInfo,
  visibleMeters: number,
  yawRad: number
): number[] {
  const playerU = 0.5 + (playerWorldX - tile.centerWorldX) / tile.imageMeters
  const playerV = 0.5 + (playerWorldZ - tile.centerWorldZ) / tile.imageMeters
  const halfExtent = visibleMeters / 2 / tile.imageMeters

  const corners = [
    { du: -halfExtent, dv: -halfExtent },
    { du: -halfExtent, dv: +halfExtent },
    { du: +halfExtent, dv: +halfExtent },
    { du: +halfExtent, dv: -halfExtent }
  ]
  const c = Math.cos(yawRad)
  const s = Math.sin(yawRad)
  const out: number[] = []
  for (const { du, dv } of corners) {
    const ru = du * c + dv * s
    const rv = -du * s + dv * c
    out.push(playerU + ru, playerV + rv)
  }
  return out
}
