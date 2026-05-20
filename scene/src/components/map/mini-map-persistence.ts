/**
 * Local persistence of the minimap mode (parcel / satellite / imposters).
 *
 * Stored as a plain string in `localStorage` so the user's last choice
 * is restored on game startup. Falls back to `'parcel'` if no value is
 * present or the stored value is invalid (e.g. older build wrote
 * something else).
 */

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
  } catch {
    // localStorage may not be available in some host environments.
  }
  return 'parcel'
}

export function saveMinimapStyle(style: MinimapStyle): void {
  try {
    localStorage.setItem(MINIMAP_STYLE_LOCAL_KEY, style)
  } catch {
    // Ignore — best-effort persistence.
  }
}
