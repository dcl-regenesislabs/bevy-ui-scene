import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { AvatarPreviewElement } from '././AvatarPreviewElement'
import { getPlayer } from '@dcl/sdk/players'
import useEffect = ReactEcs.useEffect
import { type PBAvatarShape } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/avatar_shape.gen'
import { fetchProfileData } from '../../utils/passport-promise-utils'

export function UserAvatarPreviewElement({
  uiTransform,
  userId,
  allowZoom = false,
  allowRotation = true
}: {
  uiTransform: UiTransformProps
  userId: string
  allowZoom?: boolean
  allowRotation?: boolean
}): ReactElement {
  const [avatarShapeDefinition, setAvatarShapeDefinition] =
    ReactEcs.useState<PBAvatarShape>(
      getAvatarShapeDefinitionFromPlayer({ userId })
    )
  useEffect(() => {
    const localShape = getAvatarShapeDefinitionFromPlayer({ userId })
    setAvatarShapeDefinition(localShape)

    if (!getPlayer({ userId })) {
      fetchAvatarShapeFromProfile({ userId }).then((remoteShape) => {
        if (remoteShape) setAvatarShapeDefinition(remoteShape)
      })
    }
  }, [userId])

  return (
    <AvatarPreviewElement
      userId={userId}
      avatarShapeDefinition={avatarShapeDefinition}
      allowZoom={allowZoom}
      allowRotation={allowRotation}
      uiTransform={{
        ...uiTransform
      }}
    />
  )
}

function getAvatarShapeDefinitionFromPlayer({
  userId
}: {
  userId: string
}): PBAvatarShape {
  const player = getPlayer({ userId })

  return {
    id: userId,
    emotes: [],
    forceRender: player?.forceRender ?? [],
    bodyShape: player?.avatar?.bodyShapeUrn,
    eyeColor: player?.avatar?.eyesColor,
    hairColor: player?.avatar?.hairColor,
    skinColor: player?.avatar?.skinColor,
    wearables: player?.wearables.filter((i: any) => i) ?? []
  }
}

async function fetchAvatarShapeFromProfile({
  userId
}: {
  userId: string
}): Promise<PBAvatarShape | null> {
  try {
    const profileData = await fetchProfileData({ userId, useCache: true })
    const avatarData = profileData?.avatars?.[0]?.avatar
    if (!avatarData) return null

    return {
      id: userId,
      emotes: [],
      forceRender: avatarData.forceRender ?? [],
      bodyShape: avatarData.bodyShape,
      eyeColor: avatarData.eyes?.color,
      hairColor: avatarData.hair?.color,
      skinColor: avatarData.skin?.color,
      wearables: avatarData.wearables?.filter((i: any) => i) ?? []
    }
  } catch {
    return null
  }
}
