import { type MinimapStyle } from './mini-map-tiles'

declare const localStorage: any

const MINIMAP_STYLE_LOCAL_KEY = 'bevy-ui-scene:minimap-style'
const VALID_STYLES: MinimapStyle[] = ['parcel', 'satellite', 'imposters']

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
