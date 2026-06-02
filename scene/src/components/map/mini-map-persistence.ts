import { type MinimapStyle } from './mini-map-tiles'

export type MinimapRotation = 'camera' | 'north'
export type BigMapStyle = '2d' | '3d'
export type BigMap2DLayer = 'parcel' | 'satellite'

declare const localStorage: any

const MINIMAP_STYLE_LOCAL_KEY = 'bevy-ui-scene:minimap-style'
const VALID_STYLES: MinimapStyle[] = ['parcel', 'satellite', 'imposters']

const MINIMAP_ROTATION_LOCAL_KEY = 'bevy-ui-scene:minimap-rotation'
const VALID_ROTATIONS: MinimapRotation[] = ['camera', 'north']

const BIG_MAP_STYLE_LOCAL_KEY = 'bevy-ui-scene:big-map-style'
const VALID_BIG_MAP_STYLES: BigMapStyle[] = ['2d', '3d']

const BIG_MAP_2D_LAYER_LOCAL_KEY = 'bevy-ui-scene:big-map-2d-layer'
const VALID_BIG_MAP_2D_LAYERS: BigMap2DLayer[] = ['parcel', 'satellite']

export function loadMinimapStyle(): MinimapStyle {
  try {
    const stored: string = localStorage.getItem(MINIMAP_STYLE_LOCAL_KEY)
    if (stored && (VALID_STYLES as string[]).includes(stored)) {
      return stored as MinimapStyle
    }
  } catch {}
  return 'satellite'
}

export function saveMinimapStyle(style: MinimapStyle): void {
  try {
    localStorage.setItem(MINIMAP_STYLE_LOCAL_KEY, style)
  } catch {}
}

export function loadMinimapRotation(): MinimapRotation {
  try {
    const stored: string = localStorage.getItem(MINIMAP_ROTATION_LOCAL_KEY)
    if (stored && (VALID_ROTATIONS as string[]).includes(stored)) {
      return stored as MinimapRotation
    }
  } catch {}
  return 'camera'
}

export function saveMinimapRotation(rotation: MinimapRotation): void {
  try {
    localStorage.setItem(MINIMAP_ROTATION_LOCAL_KEY, rotation)
  } catch {}
}

export function loadBigMapStyle(): BigMapStyle {
  try {
    const stored: string = localStorage.getItem(BIG_MAP_STYLE_LOCAL_KEY)
    if (stored && (VALID_BIG_MAP_STYLES as string[]).includes(stored)) {
      return stored as BigMapStyle
    }
  } catch {}
  return '2d'
}

export function saveBigMapStyle(style: BigMapStyle): void {
  try {
    localStorage.setItem(BIG_MAP_STYLE_LOCAL_KEY, style)
  } catch {}
}

export function loadBigMap2DLayer(): BigMap2DLayer {
  try {
    const stored: string = localStorage.getItem(BIG_MAP_2D_LAYER_LOCAL_KEY)
    if (stored && (VALID_BIG_MAP_2D_LAYERS as string[]).includes(stored)) {
      return stored as BigMap2DLayer
    }
  } catch {}
  return 'satellite'
}

export function saveBigMap2DLayer(layer: BigMap2DLayer): void {
  try {
    localStorage.setItem(BIG_MAP_2D_LAYER_LOCAL_KEY, layer)
  } catch {}
}
