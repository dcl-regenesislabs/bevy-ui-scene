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
import { teleportTo, changeRealm } from '~system/RestrictedActions'
import { getRealm } from '~system/Runtime'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
import { fetchJsonOrTryFallback } from '../../utils/promise-utils'
import {
  CATALYST_BASE_URL_FALLBACK,
  WORLDS_CONTENT_SERVER_URL
} from '../../utils/constants'
import { executeTask } from '@dcl/sdk/ecs'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
import { PopupBackdrop } from '../../components/popup-backdrop'

const state = {
  rememberDomain: false
}

export type TeleportPopupData = string | { coordinates: string; realm?: string }

export const PopupTeleport: Popup = ({ shownPopup }): ReactElement | null => {
  if (shownPopup?.type !== HUD_POPUP_TYPE.TELEPORT) return null

  const data = shownPopup.data as TeleportPopupData
  const coordString = typeof data === 'string' ? data : data.coordinates
  const targetRealm = typeof data === 'string' ? undefined : data.realm

  const [x, y] = coordString
    .replace(' ', '')
    .split(',')
    .map((n) => Number(n))
  const worldCoordinates = { x, y }
  return (
    <PopupBackdrop>
      <TeleportContent
        worldCoordinates={worldCoordinates}
        targetRealm={targetRealm}
      />
    </PopupBackdrop>
  )
}
function TeleportContent({
  worldCoordinates,
  targetRealm
}: {
  worldCoordinates: Vector2
  targetRealm?: string
}): ReactElement {
  const [sceneTitle, setSceneTitle] = useState<string>('')
  const [sceneThumbnail, setSceneThumbnail] = useState<string | null>(null)
  const [realmChangeNeeded, setRealmChangeNeeded] = useState<boolean>(false)
  const [resolvedTargetRealm, setResolvedTargetRealm] = useState<
    string | undefined
  >(targetRealm)
  const fontSizeTitle = getFontSize({
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

        const MAIN_REALM = 'https://realm-provider.decentraland.org/main'
        const effectiveTargetRealm = targetRealm ?? MAIN_REALM
        const currentRealm =
          realm.realmInfo?.realmName ?? realm.realmInfo?.baseUrl ?? ''
        const isOnDifferentRealm =
          currentRealm !== effectiveTargetRealm &&
          catalystBaseURl !== effectiveTargetRealm
        setRealmChangeNeeded(isOnDifferentRealm)
        setResolvedTargetRealm(effectiveTargetRealm)

        const isWorld =
          targetRealm?.endsWith('.dcl.eth') || targetRealm?.endsWith('.eth')

        if (isWorld) {
          await fetchWorldSceneInfo(
            targetRealm ?? '',
            setSceneTitle,
            setSceneThumbnail
          )
        } else {
          await fetchMainRealmSceneInfo(
            catalystBaseURl,
            worldCoordinates,
            setSceneTitle,
            setSceneThumbnail
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
        borderRadius: BORDER_RADIUS_F,
        borderWidth: 0,
        borderColor: COLOR.WHITE,
        alignItems: 'center',
        flexDirection: 'column',
        padding: { top: '1%', bottom: '5%', left: '1%', right: '1%' }
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
          value: `\nAre you sure you want to be teleported to <b>${
            worldCoordinates.x
          },${worldCoordinates.y}?</b>${
            realmChangeNeeded
              ? `\n\nThis will also change your realm to <b>${resolvedTargetRealm}</b>`
              : ''
          }\n\n${sceneTitle}`,
          color: COLOR.WHITE,
          textWrap: 'wrap',
          fontSize: fontSizeTitle
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
            executeTask(async () => {
              try {
                if (realmChangeNeeded && resolvedTargetRealm) {
                  await changeRealm({ realm: resolvedTargetRealm })
                }
                await teleportTo({ worldCoordinates })
              } catch (error) {
                console.error(error)
              }
            })
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}
function closeDialog(): void {
  store.dispatch(closeLastPopupAction())
}

async function fetchMainRealmSceneInfo(
  catalystBaseURl: string,
  worldCoordinates: Vector2,
  setSceneTitle: (v: string) => void,
  setSceneThumbnail: (v: string | null) => void
): Promise<void> {
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
}

async function fetchWorldSceneInfo(
  worldName: string,
  setSceneTitle: (v: string) => void,
  setSceneThumbnail: (v: string | null) => void
): Promise<void> {
  const aboutUrl = `${WORLDS_CONTENT_SERVER_URL}/world/${worldName}/about`
  const aboutData = await (await fetch(aboutUrl)).json()

  const sceneUrn = aboutData.configurations?.scenesUrn?.[0]
  if (!sceneUrn) {
    setSceneTitle(`<b>${worldName}</b>\n\n`)
    return
  }

  const urnMatch = sceneUrn.match(/baseUrl=([^&]+)/)
  const baseUrl = urnMatch?.[1] ?? `${WORLDS_CONTENT_SERVER_URL}/contents/`
  const entityId = sceneUrn.match(/entity:([^?]+)/)?.[1]
  if (!entityId) {
    setSceneTitle(`<b>${worldName}</b>\n\n`)
    return
  }

  const entityData = await (await fetch(`${baseUrl}${entityId}`)).json()
  const display = entityData?.metadata?.display
  setSceneTitle(
    `<b>${display?.title ?? worldName}</b>\n${display?.description ?? ''}\n\n`
  )

  const thumbnailFileName = display?.navmapThumbnail
  const fileEntry = entityData?.content?.find(
    (f: any) => f.file === thumbnailFileName
  )
  if (fileEntry) {
    setSceneThumbnail(`${baseUrl}${fileEntry.hash}`)
  }
}
