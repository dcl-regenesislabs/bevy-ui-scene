/**
 * Helpers for the 2D image-tile minimap.
 *
 * Rendered as a SINGLE quad covering the visible viewport, sampling a
 * larger underlying texture. The texture rotates with the camera by
 * rotating the UV samples around the player's UV position (not the
 * texture center) — that way the world appears to rotate cleanly around
 * the player on screen.
 *
 * Two sources are supported, mirroring unity-explorer:
 *
 *   - `parcel`    → `https://api.decentraland.org/v1/map.png` rendered
 *                   server-side, **re-centered on the player parcel**.
 *   - `satellite` → fixed grid of pre-rendered JPGs hosted in
 *                   `genesis-city/parcels` GitHub LFS. Tile cannot be
 *                   recentered, so coverage is limited near tile
 *                   borders.
 */

export type MinimapStyle = 'parcel' | 'satellite'

// Decentraland parcels are 16m square in the world.
export const PARCEL_METERS = 16

// Underlying texture is rotated around the player's UV position. We need
// the texture to cover sqrt(2) * VISIBLE_METERS so the rotated viewport
// never reads outside the image.
//
// VISIBLE_METERS is set in mini-map-content; the texture meters below
// keep enough buffer for any rotation angle plus some slack.
export type TileInfo = {
  /** Side of the image in world meters. */
  imageMeters: number
  /** World coords of the image center. */
  centerWorldX: number
  centerWorldZ: number
  /** Texture URL. */
  url: string
}

// Snap grid for parcel mode: tile center snaps to a chunk of N parcels so
// the same image is reused while the player wanders inside the chunk.
// 16 means: refetch only every 256m of travel (vs every 16m before).
const PARCEL_SNAP_CHUNK = 16

// Image size for parcel mode (parcels). Must be larger than
// PARCEL_SNAP_CHUNK so the rotation buffer fits. With chunk=16 and
// image=48, the rotation viewport (256m diameter → 181m corner reach)
// fits with ~75m of slack.
const PARCEL_IMAGE_PARCELS = 48
const PARCEL_PX_PER_PARCEL = 16

// Satellite tiles are fixed by the genesis-city repo at 40 parcels each.
const SATELLITE_CHUNK_PARCELS = 40

function chunkSizeForStyle(style: MinimapStyle): number {
  return style === 'satellite' ? SATELLITE_CHUNK_PARCELS : PARCEL_SNAP_CHUNK
}

/** Chunk index that contains a given parcel. */
export function chunkForParcel(
  style: MinimapStyle,
  parcelX: number,
  parcelY: number
): { cx: number; cy: number } {
  const size = chunkSizeForStyle(style)
  return {
    cx: Math.floor(parcelX / size),
    cy: Math.floor(parcelY / size)
  }
}

/**
 * Build a TileInfo for a specific chunk index. Works for both styles —
 * parcel-mode picks an image larger than the chunk to leave room for
 * rotation, satellite-mode uses the fixed-size tile at the chunk's grid
 * position.
 */
export function tileInfoForChunk(
  style: MinimapStyle,
  cx: number,
  cy: number
): TileInfo {
  if (style === 'satellite') {
    const sizeMeters = SATELLITE_CHUNK_PARCELS * PARCEL_METERS
    return {
      imageMeters: sizeMeters,
      centerWorldX: cx * sizeMeters + sizeMeters / 2,
      centerWorldZ: cy * sizeMeters + sizeMeters / 2,
      url: `https://media.githubusercontent.com/media/genesis-city/parcels/new-client-images/maps/lod-0/3/${cx}%2C${cy}.jpg`
    }
  }
  // Parcel mode: tile center is the chunk center, but the image is bigger
  // than the chunk (PARCEL_IMAGE_PARCELS) to leave room for rotation.
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

/** Convenience: get the tile that contains the player. */
export function getTileInfo(
  style: MinimapStyle,
  playerParcelX: number,
  playerParcelY: number
): TileInfo {
  const { cx, cy } = chunkForParcel(style, playerParcelX, playerParcelY)
  return tileInfoForChunk(style, cx, cy)
}

/**
 * Directional prefetch: returns the 1–3 chunks the player is moving
 * toward, given the sign of their delta-position on each axis. When
 * `dirX === 0 && dirZ === 0` (player stationary) returns an empty list.
 *
 * The returned TileInfos are meant to be rendered as invisible UI
 * entities so the asset server downloads & caches them ahead of the
 * actual chunk swap. The current chunk itself is NOT included.
 */
export function getPrefetchTiles(
  style: MinimapStyle,
  playerParcelX: number,
  playerParcelY: number,
  dirX: -1 | 0 | 1,
  dirZ: -1 | 0 | 1
): TileInfo[] {
  if (dirX === 0 && dirZ === 0) return []
  const { cx, cy } = chunkForParcel(style, playerParcelX, playerParcelY)
  const tiles: TileInfo[] = []
  if (dirX !== 0) tiles.push(tileInfoForChunk(style, cx + dirX, cy))
  if (dirZ !== 0) tiles.push(tileInfoForChunk(style, cx, cy + dirZ))
  if (dirX !== 0 && dirZ !== 0)
    tiles.push(tileInfoForChunk(style, cx + dirX, cy + dirZ))
  return tiles
}

/**
 * Project a world point `(wx, wz)` into the minimap pixel space.
 *
 * Convention:
 *   - World +X = east (right on the minimap).
 *   - World +Z = north (top of the minimap when yaw = 0).
 *   - Camera-forward maps to minimap-up: the offset from player is
 *     rotated by `+yawRad` in math-CCW sense.
 *   - Screen Y grows downward → math +Y subtracted from `mapCenter`.
 *
 *   pxPerMeter = mapSize / metersDiameter
 *   mapCenter  = mapSize / 2
 */
export function worldToScreen2D(
  wx: number,
  wz: number,
  playerX: number,
  playerZ: number,
  yawRad: number,
  pxPerMeter: number,
  mapCenter: number
): { x: number; y: number } {
  // DCL uses a CW yaw convention (yaw=0 north, yaw=+90° east).
  // To put camera-forward at the top of the screen, world offsets are
  // rotated by `-yaw` in math-CCW terms, which matches the formula
  // below (R^T applied to the offset).
  const dx = (wx - playerX) * pxPerMeter
  const dz = (wz - playerZ) * pxPerMeter
  const c = Math.cos(yawRad)
  const s = Math.sin(yawRad)
  return {
    x: mapCenter + dx * c - dz * s,
    y: mapCenter - (dx * s + dz * c)
  }
}

/**
 * Build the 8-float UVs array for the minimap quad such that the
 * player's world position sits at the QUAD center on screen, the
 * sampled region matches `visibleMeters` of world around the player,
 * and the content rotates around the player's UV position by `yawRad`.
 *
 * Quad corner order in React ECS uvs (matching `getUvs` in ui-utils):
 *   [bottom-left, top-left, top-right, bottom-right]
 *
 * Conventions:
 *   - React ECS UV V axis grows UPWARD on screen (V=1 = top of screen).
 *   - The map.png texture from api.decentraland.org has NORTH at the
 *     top of the image; since V=1 corresponds to the top row of pixels,
 *     **higher V = more northward** in the world.
 *   - World +Z increases northward → playerV grows with +Z.
 */
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

  // Order MUST match getUvs (ui-utils.ts:108): A=BL, B=TL, C=TR, D=BR.
  // V grows UP, so the BOTTOM corners have lower V and the TOP corners
  // higher V.
  const corners = [
    { du: -halfExtent, dv: -halfExtent }, // BL
    { du: -halfExtent, dv: +halfExtent }, // TL
    { du: +halfExtent, dv: +halfExtent }, // TR
    { du: +halfExtent, dv: -halfExtent } // BR
  ]
  // DCL uses CW yaw, so the corner offsets are rotated by `-yaw` in the
  // math-CCW sense (R^T). Same sign convention as `worldToScreen2D`.
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
