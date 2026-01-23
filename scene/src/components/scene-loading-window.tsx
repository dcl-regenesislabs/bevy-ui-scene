import type { SceneLoadingWindow } from '../bevy-api/interface'
import { store } from '../state/store'
import { updateHudStateAction } from '../state/hud/actions'
import { BevyApi } from '../bevy-api'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentHeight, getViewportHeight } from '../service/canvas-ratio'
import { getBackgroundFromAtlas } from '../utils/ui-utils'
import { getHudFontSize } from '../ui-classes/main-hud/scene-info/SceneInfo'
import { COLOR } from './color-palette'
import { SpinnerLoading } from './spinner-loading'

export async function initSceneLoadingUi(): Promise<void> {
  const awaitSceneLoadingWindow = async (
    stream: SceneLoadingWindow[]
  ): Promise<void> => {
    console.log('uiState stream', stream)
    for await (const uiState of stream) {
      console.log('uiState', uiState)

      store.dispatch(
        updateHudStateAction({
          loadingScene: uiState
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
  if (!loadingScene.visible) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        position: 0,
        pointerFilter: 'block'
      }}
      uiBackground={{
        color: COLOR.BLACK
      }}
    >
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
            value: `${loadingScene.title}\n<b>Loading Scene Assets</b>`,
            fontSize: getHudFontSize(getViewportHeight()).BIG
          }}
        />
        <SpinnerLoading
          uiTransform={{
            width: getContentHeight() * 0.1,
            height: getContentHeight() * 0.1
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}
