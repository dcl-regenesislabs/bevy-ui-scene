import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Column, Row } from '../../../components/layout'
import { PassportSection } from './passport-section'
import { store } from '../../../state/store'
import { COLOR } from '../../../components/color-palette'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import Icon from '../../../components/icon/Icon'
import { Label } from '@dcl/sdk/react-ecs'
import { type PhotoFromApi } from '../../photos/Photos.types'
import { executeTask } from '@dcl/sdk/ecs'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

const CAMERA_REEL_BASE_URL =
  'https://camera-reel-service.decentraland.org/api/users'
const PHOTOS_PER_PAGE = 24
const GRID_COLUMNS = 3
const PHOTO_ASPECT_RATIO = 16 / 9

async function fetchUserPhotos(
  address: string
): Promise<PhotoFromApi[]> {
  try {
    const response = await fetch(
      `${CAMERA_REEL_BASE_URL}/${address}/images?limit=${PHOTOS_PER_PAGE}&offset=0&compact=true`
    )
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const data = (await response.json()) as {
      images: PhotoFromApi[]
      maxImages: number
    }
    return data.images.filter((img) => img.isPublic)
  } catch (error) {
    console.error('[passport-gallery] Error fetching user photos:', error)
    return []
  }
}

export function PassportGallery(): ReactElement {
  const profileData = store.getState().hud.profileData
  const [photos, setPhotos] = useState<PhotoFromApi[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const scale = getContentScaleRatio()
  const gap = scale * 8
  const imageWidth = (scale * 1600 - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  const imageHeight = imageWidth / PHOTO_ASPECT_RATIO

  useEffect(() => {
    if (profileData?.userId == null) return
    setLoading(true)
    executeTask(async () => {
      const result = await fetchUserPhotos(profileData.userId)
      setPhotos(result)
      setLoading(false)
    })
  }, [profileData?.userId])

  if (loading) {
    return (
      <PassportSection>
        <Label
          value="Loading photos..."
          fontSize={fontSize}
          color={COLOR.INACTIVE}
        />
      </PassportSection>
    )
  }

  if (photos.length === 0) {
    return (
      <PassportSection>
        <Column
          uiTransform={{
            width: '100%',
            minHeight: scale * 1100,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon
            icon={{ atlasName: 'icons', spriteName: 'Gallery' }}
            uiTransform={{
              width: scale * 200,
              height: scale * 200,
              margin: { bottom: scale * 20 }
            }}
          />
          <Label
            value="No public photos"
            fontSize={fontSize}
            color={COLOR.INACTIVE}
          />
        </Column>
      </PassportSection>
    )
  }

  const rows: PhotoFromApi[][] = []
  for (let i = 0; i < photos.length; i += GRID_COLUMNS) {
    rows.push(photos.slice(i, i + GRID_COLUMNS))
  }

  return (
    <PassportSection>
      <Column uiTransform={{ width: '100%' }}>
        {rows.map((row, rowIndex) => (
          <Row
            key={`photo-row-${rowIndex}`}
            uiTransform={{
              width: '100%',
              justifyContent: 'flex-start',
              margin: { bottom: gap }
            }}
          >
            {row.map((photo) => (
              <UiEntity
                key={photo.id}
                uiTransform={{
                  width: imageWidth,
                  height: imageHeight,
                  margin: { right: gap },
                  borderRadius: fontSize / 2
                }}
                uiBackground={{
                  textureMode: 'stretch',
                  texture: {
                    src: photo.thumbnailUrl ?? photo.url
                  },
                  color: COLOR.TEXT_COLOR_WHITE
                }}
              />
            ))}
          </Row>
        ))}
      </Column>
    </PassportSection>
  )
}
