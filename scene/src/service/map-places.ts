import { type Coords } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { getRealm } from '~system/Runtime'
import { FEATURES, getFeatureFlag } from './feature-flags'
import { sleep } from '../utils/dcl-utils'

// TODO move types to map-definitions.ts and use already existent PlaceFromApi
export type Place = {
  id: string
  title: string
  positions: string[] // e.g., ["-97,-95","-98,-95"]
  base_position: string
  [key: string]: any
}
export type PlaceCategory = {
  name: string
  count: number
  i18n: Record<string, string>
}
declare const localStorage: any

const MAP_LOCALSTORAGE_KEY = 'map'
const LOCALSTORAGE_SEPARATOR = '_::_'
const CACHE_TIME = 1000 * 60 * 60 * 100
const REFRESH_DELAY_MS = 5000
const [mapStorageDate, mapStoragePlaces] = (
  localStorage.getItem(MAP_LOCALSTORAGE_KEY)?.split(LOCALSTORAGE_SEPARATOR) ?? [
    '0',
    '{}'
  ]
).map((d: string) => JSON.parse(d))

function isPlaceholderPlace(p: Place): boolean {
  return p.title === 'Empty'
}

function filterRealPlaces(
  places: Record<string, Place>
): Record<string, Place> {
  const out: Record<string, Place> = {}
  for (const key in places) {
    if (!isPlaceholderPlace(places[key])) out[key] = places[key]
  }
  return out
}

const state: {
  places: Record<string, Place>
  totalPlaces: number
  done: boolean
  refreshing: boolean
  categories: PlaceCategory[]
  offset: number
} = {
  done: false,
  refreshing: false,
  places: filterRealPlaces(mapStoragePlaces ?? {}),
  totalPlaces: Number.MAX_SAFE_INTEGER,
  categories: [],
  offset: 0
}

export const getPlacesAroundParcel = (
  parcel: Coords,
  parcelRadius: number
): Place[] => {
  const radiusSq = parcelRadius * parcelRadius

  return Object.values(getLoadedMapPlaces()).filter((place: Place) => {
    return (
      place.positions?.length ? place.positions : [place.base_position]
    ).some((pos) => {
      const [x, y] = pos.split(',').map(Number)
      const dx = x - parcel.x
      const dy = y - parcel.y
      return dx * dx + dy * dy <= radiusSq
    })
  })
}

export const getPlacesBetween = (coords1: Coords, coords2: Coords): Place[] => {
  return Object.keys(state.places)
    .filter((placeKey) => {
      const place = state.places[placeKey]
      const [x, y] = place.base_position.split(',').map((n) => Number(n))
      if (
        x >= coords1.x &&
        x <= coords2.x &&
        y >= coords1.y &&
        y <= coords2.y
      ) {
        return true
      }
      return false
    })
    .map((placeKey) => state.places[placeKey])
}

export const getLoadedMapPlaces = (): Record<string, Place> => state.places

export const fromParcelCoordsToPosition = (
  { x, y }: Coords,
  options?: { parcelSize?: number; height?: number }
): { x: number; y: number; z: number } => {
  const size = options?.parcelSize ?? 16 // metros por parcela
  const height = options?.height ?? 200 // Y fija (altura)

  return Vector3.create(x * size + size / 2, height, y * size + size / 2)
}

export const cleanMapPlaces = (): void => {
  state.places = {}
}

export function getCentralParcel(parcelStrings: string[]): string | null {
  if (parcelStrings.length === 0) return null
  const parcels = parcelStrings.map((str) => {
    const [x, y] = str.split(',').map(Number)
    return { x, y }
  })
  const avgX = parcels.reduce((sum, p) => sum + p.x, 0) / parcels.length
  const avgY = parcels.reduce((sum, p) => sum + p.y, 0) / parcels.length
  const central = parcels.reduce((closest, p) => {
    const dist = Math.hypot(p.x - avgX, p.y - avgY)
    const closestDist = Math.hypot(closest.x - avgX, closest.y - avgY)
    return dist < closestDist ? p : closest
  })
  return `${central.x},${central.y}`
}
export const isMapPlacesLoaded = (): boolean => state.done
export const getPlaceCategories = (): PlaceCategory[] => state.categories
export const loadCompleteMapPlaces = async (): Promise<
  Record<string, Place>
> => {
  if (!getFeatureFlag(FEATURES.DISCOVER_MAP)) return state.places
  if (state.done || state.refreshing) return state.places

  const cacheFresh = Date.now() - mapStorageDate < CACHE_TIME
  const hasCache = Object.keys(mapStoragePlaces ?? {}).length > 0

  if (cacheFresh && hasCache) {
    state.done = true
    return state.places
  }

  state.refreshing = true
  ;(async () => {
    await sleep(REFRESH_DELAY_MS)
    await fetchAllPlacesFromApi()
    state.done = true
    state.refreshing = false
  })().catch((e) => {
    state.refreshing = false
    console.error(e)
  })

  return state.places
}

async function fetchAllPlacesFromApi(): Promise<void> {
  const LIMIT = 100
  const realm = await getRealm({})
  const realmBaseUrl = realm?.realmInfo?.baseUrl ?? ''
  const isZone = realmBaseUrl.includes('.zone')
  if (realm.realmInfo?.realmName.endsWith('.eth')) {
    return
  }
  const PLACES_BASE_URL = `https://places.decentraland.${
    isZone ? 'zone' : 'org'
  }`

  const DEFAULT_CATEGORIES: PlaceCategory[] = [
    { name: 'poi', count: 57, i18n: { en: '📍 Point of Interest' } },
    { name: 'featured', count: 5, i18n: { en: '✨ Featured' } },
    { name: 'game', count: 367, i18n: { en: '🎮 Game' } },
    { name: 'casino', count: 19, i18n: { en: '♣️ Casino' } },
    { name: 'social', count: 428, i18n: { en: '👥 Social' } },
    { name: 'music', count: 274, i18n: { en: '🎵 Music' } },
    { name: 'art', count: 783, i18n: { en: '🎨 Art' } },
    { name: 'fashion', count: 79, i18n: { en: '👠 Fashion' } },
    { name: 'crypto', count: 328, i18n: { en: '🪙 Crypto' } },
    { name: 'education', count: 207, i18n: { en: '📚 Education' } },
    { name: 'shop', count: 240, i18n: { en: '🛍️ Shop' } },
    { name: 'sports', count: 31, i18n: { en: '⚽️ Sports' } },
    { name: 'business', count: 36, i18n: { en: '🏢 Business' } },
    { name: 'parkour', count: 4, i18n: { en: '🏃 Parkour' } }
  ]
  const categories =
    (
      await fetch(`${PLACES_BASE_URL}/api/categories`).then(
        async (res) => await res.json()
      )
    ).data ?? DEFAULT_CATEGORIES
  state.categories = categories
  const MAX_PLACES_PER_CATEGORY = 100
  const merged: Record<string, Place> = { ...state.places }
  for (const category of categories) {
    let placesPerCategory: Record<string, Place> = {}
    state.offset = 0
    while (
      Object.values(placesPerCategory ?? {}).length <
      Math.min(MAX_PLACES_PER_CATEGORY, category.count)
    ) {
      const url = `${PLACES_BASE_URL}/api/places?offset=${state.offset}&limit=${LIMIT}&categories=${category.name}&order_by=like_score`
      const response = await fetch(url).then(async (r) => await r.json())
      if (!response?.data?.length) {
        break
      }

      category.count = response.total ?? 0
      placesPerCategory = {
        ...placesPerCategory,
        ...(response.data ?? [])
          .filter((p: Place) => !isPlaceholderPlace(p))
          .reduce((acc: Record<string, Place>, current: Place) => {
            acc[current.base_position] = current
            return acc
          }, {})
      }

      for (const key in placesPerCategory) {
        merged[key] = placesPerCategory[key]
      }
      state.places = merged
      state.totalPlaces = Object.keys(state.places).length

      state.offset += response?.data?.length ?? 0
      await sleep(100)
    }
    state.offset = 0
    state.totalPlaces += category.count
    await sleep(300)
  }

  if (Object.values(state.places).length > 0) {
    localStorage.setItem(
      MAP_LOCALSTORAGE_KEY,
      `${Date.now()}${LOCALSTORAGE_SEPARATOR}${JSON.stringify(state.places)}`
    )
  }
}
export function fromStringToCoords(str: string): Coords {
  const [x, y] = str.split(',').map((n) => Number(n))
  return { x, y }
}
