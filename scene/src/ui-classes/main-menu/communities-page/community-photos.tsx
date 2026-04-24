import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { executeTask } from '@dcl/sdk/ecs'
import {
  fetchCommunityPlaceIds,
  fetchCommunityPhotos,
  type CommunityPhoto
} from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

/** Chunk an array into groups of `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

const PHOTOS_PER_ROW = 4

export function CommunityPhotos({
  communityId
}: {
  communityId: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const scale = getContentScaleRatio()
  const [photos, setPhotos] = useState<CommunityPhoto[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      try {
        const placeIds = await fetchCommunityPlaceIds(communityId)
        if (placeIds.length > 0) {
          const result = await fetchCommunityPhotos(placeIds, 40)
          setPhotos(result)
        }
      } catch (error) {
        console.error('[communities] failed to load photos', error)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    const thumbSize = scale * 180
    return (
      <Row uiTransform={{ width: '100%', flexWrap: 'wrap' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <UiEntity
            key={i}
            uiTransform={{
              width: thumbSize,
              height: thumbSize,
              margin: { right: fontSize * 0.3, bottom: fontSize * 0.3 }
            }}
          >
            <LoadingPlaceholder
              uiTransform={{
                width: '100%',
                height: '100%',
                borderRadius: fontSize / 4
              }}
            />
          </UiEntity>
        ))}
      </Row>
    )
  }

  if (photos.length === 0) {
    return (
      <UiEntity
        uiText={{
          value: 'No photos yet',
          fontSize,
          color: COLOR.TEXT_COLOR_GREY
        }}
      />
    )
  }

  const rows = chunk(photos, PHOTOS_PER_ROW)

  return (
    <Column uiTransform={{ width: '100%' }}>
      {rows.map((row, rowIndex) => (
        <Row
          key={rowIndex}
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize * 0.3 }
          }}
        >
          {row.map((photo) => (
            <UiEntity
              key={photo.id}
              uiTransform={{
                width: `${100 / PHOTOS_PER_ROW}%`,
                height: scale * 180,
                padding: { right: fontSize * 0.3 }
              }}
            >
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  borderRadius: fontSize / 4
                }}
                uiBackground={{
                  textureMode: 'stretch',
                  texture: { src: photo.thumbnailUrl }
                }}
              />
            </UiEntity>
          ))}
        </Row>
      ))}
    </Column>
  )
}
