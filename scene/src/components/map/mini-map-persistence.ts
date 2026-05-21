import { type MinimapStyle } from './mini-map-tiles'

export type MinimapRotation = 'camera' | 'north'

declare const localStorage: any

const MINIMAP_STYLE_LOCAL_KEY = 'bevy-ui-scene:minimap-style'
const VALID_STYLES: MinimapStyle[] = ['parcel', 'satellite', 'imposters']

const MINIMAP_ROTATION_LOCAL_KEY = 'bevy-ui-scene:minimap-rotation'
const VALID_ROTATIONS: MinimapRotation[] = ['camera', 'north']

export function loadMinimapStyle(): MinimapStyle {
  try {
    const stored: string = localStorage.getItem(MINIMAP_STYLE_LOCAL_KEY)
    if (stored && (VALID_STYLES as string[]).includes(stored)) {
      return stored as MinimapStyle
    }
  } catch {}
  return 'parcel'
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
