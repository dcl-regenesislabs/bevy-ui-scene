import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { AvatarPreviewElement } from '../../../components/backpack/./AvatarPreviewElement'
import { getPlayer } from '@dcl/sdk/players'
import { store } from '../../../state/store'
import { type PBAvatarShape } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/avatar_shape.gen'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
import { type WearableCategory } from '../../../service/categories'

export function BackpackAvatarPreviewElement(): ReactElement {
  const [avatarShapeDefinition, setAvatarShapeDefinition] =
    useState<PBAvatarShape>(getAvatarShapeFromBackpackStore())
  useEffect(() => {
    setAvatarShapeDefinition(getAvatarShapeFromBackpackStore())
  }, [
    store.getState().backpack.equippedWearables,
    store.getState().backpack.forceRender,
    store.getState().backpack.outfitSetup.base
  ])
  const [activeWearableCategory, setActiveWearableCategory] =
    useState<WearableCategory | null>(
      store.getState().backpack.activeWearableCategory
    )
  useEffect(() => {
    setActiveWearableCategory(store.getState().backpack.activeWearableCategory)
  }, [store.getState().backpack.activeWearableCategory])
  return (
    <AvatarPreviewElement
      avatarShapeDefinition={avatarShapeDefinition}
      uiTransform={{}}
      userId={getPlayer()?.userId ?? ''}
      allowZoom={false}
      allowRotation={true}
      cameraCategory={activeWearableCategory}
    />
  )
}

export function getAvatarShapeFromBackpackStore(): PBAvatarShape {
  return {
    wearables: store.getState().backpack.equippedWearables,
    eyeColor: store.getState().backpack.outfitSetup.base.eyesColor,
    hairColor: store.getState().backpack.outfitSetup.base.hairColor,
    skinColor: store.getState().backpack.outfitSetup.base.skinColor,
    bodyShape: store.getState().backpack.outfitSetup.base.bodyShapeUrn,
    forceRender: store.getState().backpack.forceRender,
    id: 'any',
    emotes: store.getState().backpack.equippedEmotes
  }
}
