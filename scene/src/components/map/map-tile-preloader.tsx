import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { tileInfoForChunk } from './mini-map-tiles'
import { sleep } from '../../utils/dcl-utils'
import { executeTask } from '@dcl/sdk/ecs'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState

const PRELOAD_VISIBLE_MS = 15000
const SATELLITE_PHASE_DELAY_MS = 1500
const SATELLITE_GRID_SIZE = 8
const PARCEL_TILE_PARCELS = 48
const PARCEL_TILE_PX_PER_PARCEL = 16
const PARCEL_GRID_MIN = -4
const PARCEL_GRID_MAX = 3

function parcelAtlasUrl(centerParcelX: number, centerParcelY: number): string {
  const px = PARCEL_TILE_PARCELS * PARCEL_TILE_PX_PER_PARCEL
  return `https://api.decentraland.org/v1/map.png?center=${centerParcelX},${centerParcelY}&width=${px}&height=${px}&size=${PARCEL_TILE_PX_PER_PARCEL}`
}

export function MapTilePreloader(): ReactElement | null {
  const [phase, setPhase] = useState<'parcel' | 'both' | 'done'>('parcel')

  useEffect(() => {
    executeTask(async () => {
      await sleep(SATELLITE_PHASE_DELAY_MS)
      setPhase('both')
      await sleep(PRELOAD_VISIBLE_MS - SATELLITE_PHASE_DELAY_MS)
      setPhase('done')
    })
  }, [])

  if (phase === 'done') return null

  const urls: string[] = []

  for (let cy = PARCEL_GRID_MIN; cy <= PARCEL_GRID_MAX; cy++) {
    for (let cx = PARCEL_GRID_MIN; cx <= PARCEL_GRID_MAX; cx++) {
      const centerParcelX = cx * PARCEL_TILE_PARCELS + PARCEL_TILE_PARCELS / 2
      const centerParcelY = cy * PARCEL_TILE_PARCELS + PARCEL_TILE_PARCELS / 2
      urls.push(parcelAtlasUrl(centerParcelX, centerParcelY))
    }
  }

  if (phase === 'both') {
    for (let cy = 0; cy < SATELLITE_GRID_SIZE; cy++) {
      for (let cx = 0; cx < SATELLITE_GRID_SIZE; cx++) {
        const info = tileInfoForChunk('satellite', cx, cy)
        if (info !== null) urls.push(info.url)
      }
    }
  }

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        width: 1,
        height: 1,
        opacity: 0,
        pointerFilter: 'none'
      }}
    >
      {urls.map((url) => (
        <UiEntity
          key={`preload-${url}`}
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: 0 },
            width: 1,
            height: 1
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: url }
          }}
        />
      ))}
    </UiEntity>
  )
}
