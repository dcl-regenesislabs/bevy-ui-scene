import type { SceneLoadingWindow } from '../bevy-api/interface'
import { store } from '../state/store'
import { updateHudStateAction } from '../state/hud/actions'
import { BevyApi } from '../bevy-api'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentHeight } from '../service/canvas-ratio'
import { getBackgroundFromAtlas } from '../utils/ui-utils'
import { SpinnerLoading } from './spinner-loading'
import { getFontSize } from 'src/service/fontsize-system'
import { changeRealm } from '~system/RestrictedActions'
import { getRealm } from '~system/Runtime'
import { executeTask } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import { ButtonText } from './button-text'
import {
  ALMOST_BLACK,
  CLICKED_PRIMARY_COLOR,
  RUBY
} from '../utils/constants'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

const GENESIS_CITY_REALM = 'https://realm-provider-ea.decentraland.org/main'

// Don't flash the disconnected prompt during the initial connection on startup,
// nor while a realm change requested from it is in flight.
const DISCONNECT_PROMPT_GRACE_MS = 1000
let suppressDisconnectPromptUntil = Date.now() + DISCONNECT_PROMPT_GRACE_MS
function suppressDisconnectPrompt(): void {
  suppressDisconnectPromptUntil = Date.now() + DISCONNECT_PROMPT_GRACE_MS
}

function normalizeRealm(realm: string | null | undefined): string {
  return (realm ?? '').trim().toLowerCase().replace(/\/+$/, '')
}

export async function initSceneLoadingUi(): Promise<void> {
  const awaitSceneLoadingWindow = async (
    stream: SceneLoadingWindow[]
  ): Promise<void> => {
    console.log('uiState stream', stream)
    for await (const uiState of stream) {
      console.log('uiState', uiState)

      store.dispatch(
        updateHudStateAction({
          loadingScene: {
            ...uiState,
            // Older engines don't emit this field — assume connected.
            realmConnected: uiState.realmConnected !== false
          }
        })
      )
    }
  }
  awaitSceneLoadingWindow(await BevyApi.getSceneLoadingUIStream()).catch(
    console.error
  )
}

export function SceneLoadingWindowComponent(): ReactElement | null {
  const loadingScene = store.getState().hud.loadingScene
  // Only treat an explicit `false` as disconnected, so a missing field
  // (older engine) is assumed connected.
  if (loadingScene.realmConnected === false) {
    if (Date.now() < suppressDisconnectPromptUntil) return null
    return <RealmDisconnectedComponent />
  }
  if (!loadingScene.visible) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: 0,
        pointerFilter: 'block',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: {
          src: 'assets/images/login/gradient-background.png'
        }
      }}
    >
      <UiEntity
        uiTransform={{
          width: getContentHeight() * 0.1,
          height: getContentHeight() * 0.1
        }}
        uiBackground={{
          textureMode: 'stretch',
          ...getBackgroundFromAtlas({
            spriteName: 'DdlIconColor',
            atlasName: 'icons'
          })
        }}
      />
      <UiEntity
        uiText={{
          value: `<b>${loadingScene.title}</b>\nLoading Scene Assets ${
            loadingScene.pendingAssets ? `(${loadingScene.pendingAssets})` : ''
          }`,
          fontSize: getFontSize({})
        }}
      />
      <SpinnerLoading
        uiTransform={{
          width: getContentHeight() * 0.1,
          height: getContentHeight() * 0.1
        }}
      />
    </UiEntity>
  )
}

function RealmDisconnectedComponent(): ReactElement {
  const [currentRealm, setCurrentRealm] = useState<string | null>(null)
  const [retryBackground, setRetryBackground] = useState<Color4>(RUBY)
  const [genesisBackground, setGenesisBackground] =
    useState<Color4>(ALMOST_BLACK)
  const fontSize = getFontSize({})

  // RealmInfo carries the realm base URL even while disconnected (the engine
  // keeps it pointed at the realm it's attempting), so retry can target it.
  useEffect(() => {
    executeTask(async () => {
      try {
        const realm = await getRealm({})
        setCurrentRealm(realm.realmInfo?.baseUrl ?? null)
      } catch (error) {
        console.error(error)
      }
    })
  }, [])

  // Show Genesis unless we know we're already on it.
  const showGenesis =
    !currentRealm ||
    normalizeRealm(currentRealm) !== normalizeRealm(GENESIS_CITY_REALM)

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: 0,
        pointerFilter: 'block',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: {
          src: 'assets/images/login/gradient-background.png'
        }
      }}
    >
      <UiEntity
        uiTransform={{
          width: getContentHeight() * 0.1,
          height: getContentHeight() * 0.1
        }}
        uiBackground={{
          textureMode: 'stretch',
          ...getBackgroundFromAtlas({
            spriteName: 'DdlIconColor',
            atlasName: 'icons'
          })
        }}
      />
      <UiEntity
        uiTransform={{
          margin: { top: fontSize, bottom: fontSize * 1.5 },
          width: getContentHeight() * 0.6
        }}
        uiText={{
          value:
            "<b>Couldn't connect to the realm</b>\nThe connection to the realm couldn't be established. Retry, or jump to Genesis City.",
          fontSize
        }}
      />
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <ButtonText
          uiTransform={{
            margin: fontSize * 0.3,
            padding: fontSize * 0.3,
            width: getContentHeight() * 0.25
          }}
          backgroundColor={retryBackground}
          value={'RETRY'}
          fontSize={fontSize}
          onMouseEnter={() => {
            setRetryBackground(CLICKED_PRIMARY_COLOR)
          }}
          onMouseLeave={() => {
            setRetryBackground(RUBY)
          }}
          onMouseDown={() => {
            if (!currentRealm) return
            suppressDisconnectPrompt()
            executeTask(async () => {
              try {
                await changeRealm({ realm: currentRealm })
              } catch (error) {
                console.error(error)
              }
            })
          }}
        />
        {showGenesis && (
          <ButtonText
            uiTransform={{
              margin: fontSize * 0.3,
              padding: fontSize * 0.3,
              width: getContentHeight() * 0.25
            }}
            backgroundColor={genesisBackground}
            value={'GO TO\nGENESIS CITY'}
            fontSize={fontSize}
            onMouseEnter={() => {
              setGenesisBackground(Color4.Gray())
            }}
            onMouseLeave={() => {
              setGenesisBackground(ALMOST_BLACK)
            }}
            onMouseDown={() => {
              suppressDisconnectPrompt()
              executeTask(async () => {
                try {
                  await changeRealm({ realm: GENESIS_CITY_REALM })
                } catch (error) {
                  console.error(error)
                }
              })
            }}
          />
        )}
      </UiEntity>
    </UiEntity>
  )
}
