import ReactEcs, { Button, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { store } from '../../state/store'
import { COLOR } from '../../components/color-palette'
import { closeLastPopupAction } from '../../state/hud/actions'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../utils/ui-utils'
import { noop } from '../../utils/function-utils'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import Icon from '../../components/icon/Icon'
import { Color4, type Vector2 } from '@dcl/sdk/math'
import { type Popup } from '../../components/popup-stack'
import { teleportTo } from '~system/RestrictedActions'
import { getRealm } from '~system/Runtime'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
import { fetchJsonOrTryFallback } from '../../utils/promise-utils'
import { CATALYST_BASE_URL_FALLBACK } from '../../utils/constants'
import { executeTask } from '@dcl/sdk/ecs'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'

const state = {
  rememberDomain: false
}

export const PopupTeleport: Popup = ({ shownPopup }): ReactElement | null => {
  const URL: string = shownPopup.data as string

  if (shownPopup?.type !== HUD_POPUP_TYPE.TELEPORT) return null
  const [x, y] = URL.replace(' ', '')
    .split(',')
    .map((n) => Number(n))
  const worldCoordinates = { x, y }
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        zIndex: 999,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_7
      }}
      onMouseDown={() => {
        closeDialog()
      }}
    >
      <TeleportContent worldCoordinates={worldCoordinates} />
    </UiEntity>
  )
}
function TeleportContent({
  worldCoordinates
}: {
  worldCoordinates: Vector2
}): ReactElement {
  const [sceneTitle, setSceneTitle] = useState<string>('')
  const [sceneThumbnail, setSceneThumbnail] = useState<string | null>(null)
  const fontSize_title = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  useEffect(() => {
    executeTask(async () => {
      try {
        const realm = await getRealm({})
        const catalystBaseURl =
          realm.realmInfo?.baseUrl ?? CATALYST_BASE_URL_FALLBACK
        const [result] = await fetchJsonOrTryFallback(
          `${catalystBaseURl}/content/entities/scene?pointer=${worldCoordinates.x},${worldCoordinates.y}`
        )
        setSceneTitle(
          `<b>${result.metadata.display.title}</b>\n${result.metadata.display.description}\n\n`
        )
        const thumbnailFileName = result.metadata.display?.navmapThumbnail
        const fileEntry = result.content.find(
          (f: any) => f.file === thumbnailFileName
        )
        if (fileEntry) {
          setSceneThumbnail(
            `https://peer.decentraland.org/content/contents/${fileEntry.hash}`
          )
        }
      } catch (error) {
        console.error(error)
      }
    })
  }, [])

  return (
    <UiEntity
      uiTransform={{
        width: getContentScaleRatio() * 1200,
        height: getContentScaleRatio() * 1400,
        borderRadius: BORDER_RADIUS_F,
        borderWidth: 0,
        borderColor: COLOR.WHITE,
        alignItems: 'center',
        flexDirection: 'column',
        padding: '1%'
      }}
      onMouseDown={noop}
      uiBackground={{
        color: COLOR.URL_POPUP_BACKGROUND
      }}
    >
      <Icon
        uiTransform={{
          positionType: 'absolute',
          position: { top: '4%' }
        }}
        icon={{ spriteName: 'WarpIn', atlasName: 'icons' }}
        iconSize={getContentScaleRatio() * 96}
        iconColor={COLOR.WHITE}
      />

      <UiEntity
        uiText={{
          value: `\nAre you sure you want to be teleported to <b>${worldCoordinates.x},${worldCoordinates.y}?</b>\n\n${sceneTitle}`,
          color: COLOR.WHITE,
          textWrap: 'wrap',
          fontSize: fontSize_title
        }}
        uiTransform={{
          margin: { top: '8%' },
          borderRadius: BORDER_RADIUS_F,
          borderWidth: 0,
          borderColor: COLOR.RED,
          width: '90%'
        }}
      />

      <UiEntity
        uiTransform={{
          width: getContentScaleRatio() * 1000,
          height: getContentScaleRatio() * 600,
          borderRadius: 0,
          borderColor: COLOR.WHITE_OPACITY_1,
          borderWidth: 1,
          flexShrink: 0
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: sceneThumbnail ? { src: sceneThumbnail } : undefined
        }}
      />

      <UiEntity
        uiTransform={{
          position: { left: '0%', top: '5%' },
          alignItems: 'space-between',
          justifyContent: 'center'
        }}
      >
        <Button
          uiTransform={{
            margin: '2%',
            width: getContentScaleRatio() * 400,
            borderRadius: BORDER_RADIUS_F / 2,
            borderWidth: 0,
            borderColor: Color4.White(),
            flexShrink: 0,
            height: fontSize * 2
          }}
          value={'CANCEL'}
          variant={'secondary'}
          uiBackground={{ color: COLOR.TEXT_COLOR }}
          color={Color4.White()}
          fontSize={fontSize}
          onMouseDown={() => {
            closeDialog()
          }}
        />
        <Button
          uiTransform={{
            margin: '2%',
            width: getContentScaleRatio() * 400,
            borderRadius: BORDER_RADIUS_F / 2,
            borderWidth: 0,
            borderColor: Color4.White(),
            flexShrink: 0,
            height: fontSize * 2
          }}
          value={'CONTINUE'}
          variant={'primary'}
          fontSize={fontSize}
          onMouseUp={() => {
            state.rememberDomain = false

            closeDialog()
            teleportTo({ worldCoordinates }).catch(console.error)
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}
function closeDialog(): void {
  store.dispatch(closeLastPopupAction())
}
