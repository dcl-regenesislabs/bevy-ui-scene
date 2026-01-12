import { ReactEcs, ReactElement, UiEntity } from '@dcl/react-ecs'
import useEffect = ReactEcs.useEffect
import {
  InputBinding,
  SystemHoverAction,
  SystemHoverEvent
} from '../../bevy-api/interface'
import { engine, executeTask, PBUiText, PrimaryPointerInfo } from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'
import { getViewportHeight } from '../../service/canvas-ratio'
import useState = ReactEcs.useState
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import { UiTransformProps } from '@dcl/sdk/react-ecs'
import { getHudFontSize } from '../../ui-classes/main-hud/scene-info/SceneInfo'

export const HoverActionComponent = (): ReactElement | null => {
  const [hoverActions, setHoverActions] = useState<SystemHoverAction[]>([])
  useEffect(() => {
    executeTask(async () => {
      listenStream(await BevyApi.getHoverStream()).catch(console.error)
    })

    async function listenStream(stream: SystemHoverEvent[]): Promise<void> {
      for await (const systemHoverEvent of stream) {
        console.log('systemHoverEvent', systemHoverEvent)
        if (systemHoverEvent.entered) {
          const _actions = systemHoverEvent.actions.slice(0, 7)
          console.log('_actions', _actions.length)
          setHoverActions(_actions)
        } else {
          setHoverActions([])
        }
      }
    }
  }, [])
  const pointerInfo = PrimaryPointerInfo.get(engine.RootEntity)
  if (!hoverActions?.length) return null
  if (!pointerInfo.screenCoordinates) return null
  const size = getViewportHeight() * 0.3
  const bubbleHeight = getViewportHeight() * 0.05
  const hoverTipTransforms: UiTransformProps[] = [
    {
      position: { left: '75%', top: size * 0.5 - bubbleHeight / 2 }
    },
    {
      position: { right: '75%', top: size * 0.5 - bubbleHeight / 2 },
      flexDirection: 'row-reverse'
    },
    {
      justifyContent: 'center',
      position: { top: -bubbleHeight / 3 }
    },
    { position: { left: '65%', top: size * 0.75 - bubbleHeight / 2 } },
    {
      position: { right: '65%', top: size * 0.75 - bubbleHeight / 2 },
      flexDirection: 'row-reverse'
    },
    { position: { left: '65%', top: size * 0.25 - bubbleHeight / 2 } },
    {
      position: { right: '65%', top: size * 0.25 - bubbleHeight / 2 },
      flexDirection: 'row-reverse'
    }
  ]

  return (
    <UiEntity
      uiTransform={{
        width: size,
        height: size,
        positionType: 'absolute',
        justifyContent: 'center',
        position: {
          top: pointerInfo.screenCoordinates.y - size / 2,
          left: pointerInfo.screenCoordinates.x - size / 2
        },
        flexGrow: 1,
        flexShrink: 0,
        borderColor: COLOR.RED,
        borderWidth: 1,
        borderRadius: 0
      }}
    >
      {hoverActions.map((hoverAction, index) => (
        <RenderHoverAction
          uiTransform={{
            height: bubbleHeight,
            positionType: 'absolute',
            ...hoverTipTransforms[index]
          }}
          hoverActions={hoverActions}
          index={index}
        />
      ))}
    </UiEntity>
  )
}

function RenderHoverAction({
  hoverActions,
  index,
  uiTransform
}: {
  hoverActions: SystemHoverAction[]
  index: number
  uiTransform: UiTransformProps
}): ReactElement {
  const hoverAction = hoverActions[index]
  if (!hoverAction) return <UiEntity></UiEntity>
  return (
    <UiEntity
      uiTransform={{
        padding: getViewportHeight() * 0.01,
        borderRadius: getViewportHeight() * 0.01,
        borderWidth: 0,
        borderColor: COLOR.BLACK_TRANSPARENT,
        ...uiTransform
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_7 }}
    >
      {hoverAction.inputBinding && (
        <KeyIcon inputBinding={hoverAction.inputBinding} />
      )}
      <UiEntity
        uiTransform={{ width: '100%' }}
        uiText={{
          value: `${hoverAction.hoverText ?? 'Interact'}`,
          fontSize: getHudFontSize(getViewportHeight()).NORMAL,
          textWrap: 'nowrap'
        }}
      />
    </UiEntity>
  )
}

export function KeyIcon({
  inputBinding
}: {
  inputBinding: InputBinding
}): ReactElement {
  const isDigit = inputBinding.indexOf('Digit') === 0
  const isMouse = inputBinding.indexOf('Mouse') === 0
  const fontSize = getHudFontSize(getViewportHeight()).NORMAL
  const KeyBorder = {
    width: fontSize * 2,
    height: fontSize * 2,
    borderColor: COLOR.WHITE,
    borderWidth: 2,
    borderRadius: fontSize * 0.6,
    flexShrink: 0,
    flexGrow: 0,
    padding: { top: -fontSize * 0.1 }
  }
  if (isDigit)
    return (
      <UiEntity
        uiTransform={{ ...KeyBorder }}
        uiText={{
          value: `<b>${inputBinding.replace('Digit', '')}</b>`,
          fontSize
        }}
      ></UiEntity>
    )

  if (isMouse)
    return (
      <Icon
        uiTransform={{ flexShrink: 0, flexGrow: 0 }}
        icon={{ spriteName: 'MouseLeftClick', atlasName: 'icons' }}
        iconSize={fontSize * 1.5}
        iconColor={COLOR.WHITE}
      />
    )

  return (
    <UiEntity
      uiTransform={{ ...KeyBorder }}
      uiText={{ value: `<b>${inputBinding.replace('Key', '')}</b>`, fontSize }}
    ></UiEntity>
  )
}
