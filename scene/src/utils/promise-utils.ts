// import { getPlayer } from '@dcl/sdk/src/players'
import type {
  PhotoFromApi,
  PhotoMetadataResponse,
  WearableData,
  WearableResponse
} from 'src/ui-classes/photos/Photos.types'
import type {
  EventFromApi,
  PlaceFromApi
} from 'src/ui-classes/scene-info-card/SceneInfoCard.types'
import { CATALYST_BASE_URL_FALLBACK, EMPTY_PHOTO_METADATA } from './constants'
import type { FormattedURN } from './definitions'
import { BevyApi } from 'src/bevy-api'
import type { KernelFetchRespose } from 'src/bevy-api/interface'
import { type Vector3 } from '@dcl/ecs-math'
// import { cleanFavToSend, cleanLikeToSend } from 'src/state/sceneInfo/actions'
import { getRealm } from '~system/Runtime'

type EventsResponse = {
  ok: boolean
  data: EventFromApi[]
}

type PlacesResponse = {
  ok: boolean
  total: number
  data: PlaceFromApi[]
}

type PhotosResponse = {
  images: PhotoFromApi[]
  maxImages: number
}

export async function fetchEvents(coords: string[]): Promise<EventFromApi[]> {
  const param = coords.map((coord) => `positions[]=${coord}`).join('&')
  try {
    const responseEvents: KernelFetchRespose = await BevyApi.kernelFetch({
      url: `https://events.decentraland.org/api/events/?${param}`
    })
    if (!responseEvents.ok) {
      throw new Error(`HTTP error! Status: ${responseEvents.status}`)
    }
    const events: EventsResponse = JSON.parse(responseEvents.body)
    return events.data
  } catch (error) {
    console.error('Error fetching events:', error)
    throw error
  }
}

export async function fetchPhotos(
  placeId: string,
  limit: number
): Promise<PhotoFromApi[]> {
  try {
    const response: Response = await fetch(
      `https://camera-reel-service.decentraland.org/api/places/${placeId}/images?limit=${limit}`
    )
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const photos: PhotosResponse = (await response.json()) as PhotosResponse
    return photos.images
  } catch (error) {
    console.error('Error fetching photos:', error)
    throw error
  }
}

export async function fetchPhotosQuantity(placeId: string): Promise<number> {
  try {
    const response: Response = await fetch(
      `https://camera-reel-service.decentraland.org/api/places/${placeId}/images`
    )
    if (!response.ok) {
      return 0
    }
    const photos: PhotosResponse = (await response.json()) as PhotosResponse
    return photos.maxImages
  } catch (error) {
    console.error('Error fetching photos:', error)
    return 0
  }
}

export async function fetchPhotoMetadata(
  photoId: string
): Promise<PhotoMetadataResponse> {
  try {
    const response: Response = await fetch(
      `https://camera-reel-service.decentraland.org/api/images/${photoId}/metadata`
    )
    if (!response.ok) {
      return EMPTY_PHOTO_METADATA
    }

    const photoMetadata: PhotoMetadataResponse =
      (await response.json()) as PhotoMetadataResponse
    return photoMetadata
  } catch (error) {
    console.error('Error fetching photos:', error)
    return EMPTY_PHOTO_METADATA
  }
}

export async function fetchWearable(
  urn: FormattedURN
): Promise<WearableData | null> {
  try {
    console.log(
      'FETCHING WEARABLE contractAddress = ',
      urn.contractAddress,
      ' - ItemId = ',
      urn.itemId
    )
    const response: Response = await fetch(
      `https://marketplace-api.decentraland.org/v1/items?contractAddress=${urn.contractAddress}&itemId=${urn.itemId}`
    )
    if (!response.ok) {
      return null
    }
    const wearableData: WearableResponse =
      (await response.json()) as WearableResponse

    if (wearableData.total === 0) {
      return null
    }

    console.log({ wearableData })

    return wearableData.data[0]
  } catch (error) {
    console.error('Error fetching photos:', error)
    return null
  }
}

export async function fetchPlaceFromCoords(
  coords: Vector3
): Promise<PlaceFromApi> {
  try {
    const response: KernelFetchRespose = await BevyApi.kernelFetch({
      url: `https://places.decentraland.org/api/places/?positions=${
        coords.x + ',' + coords.z
      }`
    })
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const place: PlacesResponse = JSON.parse(response.body) as PlacesResponse
    return place.data[0]
  } catch (error) {
    console.error('Error fetching place:', error)
    throw error
  }
}

export type PatchFavoritesResponse = {
  ok: boolean
  data: {
    favorites: number
    user_favorite: boolean
  }
}

export async function updateFavoriteStatus(
  placeId: string,
  fav: boolean
): Promise<void> {
  const url = `https://places.decentraland.org/api/places/${placeId}/favorites`
  const patchData = {
    favorites: fav
  }

  try {
    await BevyApi.kernelFetch({
      url,
      init: {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchData)
      }
    })
  } catch (error) {
    console.error('Error updating favorite status:', error)
    throw new Error('Failed to update favorite status')
  }
}

export async function fetchJsonOrTryFallback(URL: string): Promise<any> {
  const realmBaseURL =
    (await getRealm({})).realmInfo?.baseUrl ?? CATALYST_BASE_URL_FALLBACK
  try {
    return await (await fetch(URL)).json()
  } catch (error) {
    console.log(
      'USING FALLBACK',
      URL,
      CATALYST_BASE_URL_FALLBACK,
      URL.replace(realmBaseURL, CATALYST_BASE_URL_FALLBACK)
    )
    return await (
      await fetch(URL.replace(realmBaseURL, CATALYST_BASE_URL_FALLBACK))
    ).json()
  }
}

export async function updateLikeStatus(
  placeId: string,
  liked: boolean | null
): Promise<void> {
  const url = `https://places.decentraland.org/api/places/${placeId}/likes`
  const patchData = {
    like: liked
  }

  try {
    await BevyApi.kernelFetch({
      url,
      init: {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchData)
      }
    })
  } catch (error) {
    console.error('Error updating like status:', error)
    throw new Error('Failed to update like status')
  }
}
export async function createAttendee(eventId: string): Promise<void> {
  const url = `https://events.decentraland.org/api/events/${eventId}/attendees`

  const responseCreateAttendee: KernelFetchRespose = await BevyApi.kernelFetch({
    url,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  })
  if (!responseCreateAttendee.ok) {
    console.error(
      'Error creating attendee intention: status code: ',
      responseCreateAttendee.status
    )
    throw new Error(`HTTP error! Status: ${responseCreateAttendee.status}`)
  }
}

export async function removeAttendee(eventId: string): Promise<void> {
  const url = `https://events.decentraland.org/api/events/${eventId}/attendees`
  const responseRemoveAttendee: KernelFetchRespose = await BevyApi.kernelFetch({
    url,
    init: {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  })
  if (!responseRemoveAttendee.ok) {
    console.error(
      'Error deleting attendee intention: status code: ',
      responseRemoveAttendee.status
    )
    throw new Error(`HTTP error! Status: ${responseRemoveAttendee.status}`)
  }
}

export async function getFavoritesFromApi(): Promise<PlaceFromApi[]> {
  const responseFavs: KernelFetchRespose = await BevyApi.kernelFetch({
    url: `https://places.decentraland.org/api/places?only_favorites=true&with_realms_detail=true`
  })
  if (!responseFavs.ok) {
    throw new Error(`HTTP error! Status: ${responseFavs.status}`)
  }
  const favs = JSON.parse(responseFavs.body)
  return favs.data
}

export async function fetchPlaceFromApi(id: string): Promise<PlaceFromApi> {
  const responsePlace: KernelFetchRespose = await BevyApi.kernelFetch({
    url: `https://places.decentraland.org/api/places/${id}`
  })
  if (!responsePlace.ok) {
    throw new Error(`HTTP error! Status: ${responsePlace.status}`)
  }
  const place = JSON.parse(responsePlace.body)
  return place.data
}
