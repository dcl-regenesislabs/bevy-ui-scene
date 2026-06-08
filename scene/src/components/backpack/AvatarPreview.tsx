import { type Entity, type Orthographic, type Perspective } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { type EquippedEmote } from '../../utils/definitions'
import {
  WEARABLE_CATEGORY_DEFINITIONS,
  type WearableCategory
} from '../../service/categories'

import { updateBackpackStateAction } from '../../state/backpack/actions'
import { store } from '../../state/store'

export type AvatarPreview = {
  avatarEntity: Entity
  cameraEntity: Entity
}

export type OrthographicMode = {
  $case: 'orthographic'
  orthographic: Orthographic
}
export type PerspectiveMode = {
  $case: 'perspective'
  perspective: Perspective
}
export const playPreviewEmote = (emoteURN: EquippedEmote): void => {
  store.dispatch(
    updateBackpackStateAction({
      reproducingEmotePreview: emoteURN
    })
  )
}

export const AVATAR_CAMERA_POSITION: Record<string, Vector3> = {
  BODY: Vector3.create(8, 1.8, 0),
  TOP: Vector3.create(8, 2.8, 0),
  FEET: Vector3.create(8, 1.6, 0),
  UPPER_BODY: Vector3.create(8, 2.5, 0),
  PANTS: Vector3.create(8, 1.75, 0)
}
export const AVATAR_CAMERA_ZOOM: Record<string, number> = {
  BODY: 0.28,
  TOP: 0.08,
  FEET: 0.15,
  UPPER_BODY: 0.17,
  PANTS: 0.3
}
export const CATEGORY_CAMERA: Record<string, Vector3> = {
  [WEARABLE_CATEGORY_DEFINITIONS.body_shape.id]: AVATAR_CAMERA_POSITION.BODY,
  [WEARABLE_CATEGORY_DEFINITIONS.hair.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.eyebrows.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.eyes.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.mouth.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.facial_hair.id]: AVATAR_CAMERA_POSITION.TOP,

  [WEARABLE_CATEGORY_DEFINITIONS.upper_body.id]:
    AVATAR_CAMERA_POSITION.UPPER_BODY,
  [WEARABLE_CATEGORY_DEFINITIONS.hands_wear.id]: AVATAR_CAMERA_POSITION.PANTS,
  [WEARABLE_CATEGORY_DEFINITIONS.lower_body.id]: AVATAR_CAMERA_POSITION.PANTS,
  [WEARABLE_CATEGORY_DEFINITIONS.feet.id]: AVATAR_CAMERA_POSITION.FEET,

  [WEARABLE_CATEGORY_DEFINITIONS.hat.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.eyewear.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.earring.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.mask.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.tiara.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.top_head.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.helmet.id]: AVATAR_CAMERA_POSITION.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.skin.id]: AVATAR_CAMERA_POSITION.BODY
}
export const CATEGORY_CAMERA_ZOOM: Record<string, number> = {
  [WEARABLE_CATEGORY_DEFINITIONS.body_shape.id]: AVATAR_CAMERA_ZOOM.BODY,
  [WEARABLE_CATEGORY_DEFINITIONS.hair.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.eyebrows.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.eyes.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.mouth.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.facial_hair.id]: AVATAR_CAMERA_ZOOM.TOP,

  [WEARABLE_CATEGORY_DEFINITIONS.upper_body.id]: AVATAR_CAMERA_ZOOM.UPPER_BODY,
  [WEARABLE_CATEGORY_DEFINITIONS.hands_wear.id]: AVATAR_CAMERA_ZOOM.PANTS,
  [WEARABLE_CATEGORY_DEFINITIONS.lower_body.id]: AVATAR_CAMERA_ZOOM.PANTS,
  [WEARABLE_CATEGORY_DEFINITIONS.feet.id]: AVATAR_CAMERA_ZOOM.FEET,

  [WEARABLE_CATEGORY_DEFINITIONS.hat.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.eyewear.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.earring.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.mask.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.tiara.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.top_head.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.helmet.id]: AVATAR_CAMERA_ZOOM.TOP,
  [WEARABLE_CATEGORY_DEFINITIONS.skin.id]: AVATAR_CAMERA_ZOOM.BODY
}

export const setAvatarPreviewCameraToWearableCategory = (
  category: WearableCategory | null
): void => {
  console.error('REPLACE CODE', category)

  /* Transform.getMutable(avatarPreview.cameraEntity).position =
    getCameraPositionPerCategory(category) */
}

export function getCameraPositionPerCategory(
  category: WearableCategory | null
): Vector3 {
  if (category === null) return AVATAR_CAMERA_POSITION.BODY
  return CATEGORY_CAMERA[category]
}
export function getCameraZoomPerCategory(
  category: WearableCategory | null
): number {
  if (category === null) return AVATAR_CAMERA_ZOOM.BODY

  return CATEGORY_CAMERA_ZOOM[category]
}
