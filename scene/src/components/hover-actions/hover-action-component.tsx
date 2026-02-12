import { ReactEcs, type ReactElement, UiEntity } from '@dcl/react-ecs'
import {
  HoverTargetType,
  type InputBinding,
  type SystemHoverEvent
} from '../../bevy-api/interface'
import {
  engine,
  executeTask,
  inputSystem,
  PrimaryPointerInfo
} from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'
import { getViewportHeight } from '../../service/canvas-ratio'
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import { type Key, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { MAX_ZINDEX } from '../../utils/constants'
import { PointerEventType } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
import { type PBPointerEvents_Entry } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/pointer_events.gen'
import { getSceneInputBindingsMap } from '../../service/input-bindings'
import { getFontSize } from '../../service/fontsize-system'

export const HoverActionComponent = (): ReactElement | null => {
  const [systemHoverEvent, setSystemHoverEvent] =
    useState<SystemHoverEvent | null>(null)

  useEffect(() => {
    executeTask(async () => {
      listenStream(await BevyApi.getHoverStream()).catch(console.error)
    })

    async function listenStream(stream: SystemHoverEvent[]): Promise<void> {
      for await (const systemHoverEvent of stream) {
        if (
          systemHoverEvent.entered &&
          systemHoverEvent.targetType !== HoverTargetType.UI
        ) {
          setSystemHoverEvent(systemHoverEvent)
        } else {
          setSystemHoverEvent(null)
        }
      }
    }
  }, [])

  const hoverActions =
    systemHoverEvent?.actions
      .filter((hoverAction) => {
        if (
          hoverAction.eventInfo?.button !== undefined &&
          inputSystem.isPressed(hoverAction.eventInfo?.button)
        ) {
          return hoverAction.eventType === PointerEventType.PET_UP
        }
        return hoverAction.eventType === PointerEventType.PET_DOWN
      })
      .filter((h) => h.eventInfo?.showFeedback !== false)
      .slice(0, 7) ?? []
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
        zIndex: MAX_ZINDEX - 1
      }}
    >
      {systemHoverEvent &&
        hoverActions
          .filter((i) => i)
          .map((hoverAction, index) => (
            <RenderHoverAction
              tooFar={!hoverAction.enabled}
              key={index}
              uiTransform={{
                height: bubbleHeight,
                positionType: 'absolute',
                ...hoverTipTransforms[index]
              }}
              hoverAction={hoverAction}
            />
          ))}
    </UiEntity>
  )
}

function RenderHoverAction({
  hoverAction,
  uiTransform,
  tooFar
}: {
  hoverAction: PBPointerEvents_Entry
  uiTransform: UiTransformProps
  key?: Key
  tooFar: boolean
}): ReactElement {
  const inputBindings = getSceneInputBindingsMap()
  const fontSize = getFontSize({})

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
      <UiEntity
        uiTransform={{
          opacity: isUnreachable() ? 0.6 : 1
        }}
      >
        {hoverAction.eventInfo?.button !== undefined &&
          inputBindings?.[hoverAction.eventInfo.button] && (
            <KeyIcon
              inputBinding={inputBindings[hoverAction.eventInfo.button]}
            />
          )}

        <UiEntity
          uiTransform={{ width: '100%' }}
          uiText={{
            value:
              getUnreachableText() ??
              `${hoverAction.eventInfo?.hoverText ?? 'Interact'}`,
            fontSize,
            textWrap: 'nowrap'
          }}
        />
        {isUnreachable() && (
          <Icon
            uiTransform={{ position: { top: '5%' } }}
            icon={{ spriteName: 'walking', atlasName: 'icons' }}
            iconSize={fontSize * 1.5}
            iconColor={COLOR.WHITE}
          />
        )}
      </UiEntity>
    </UiEntity>
  )
  function isUnreachable(): boolean {
    return tooFar
  }
  function getUnreachableText(): string | undefined {
    return tooFar ? 'Too far, get closer' : undefined
  }
}

export function KeyIcon({
  inputBinding
}: {
  inputBinding: InputBinding
}): ReactElement {
  const isDigit = inputBinding.indexOf('Digit') === 0
  const isMouse = inputBinding.indexOf('Mouse') === 0
  const fontSize = getFontSize({})
  const KeyBorder = {
    minWidth: fontSize * 2,
    height: fontSize * 2,
    borderColor: COLOR.WHITE,
    borderWidth: 2,
    borderRadius: fontSize * 0.6,
    flexShrink: 0,
    flexGrow: 1,
    padding: { top: -fontSize * 0.1 },
    margin: { top: fontSize * -0.15 }
  }
  if (isDigit)
    return (
      <UiEntity
        uiTransform={{ ...KeyBorder }}
        uiText={{
          value: `<b>${inputBinding.replace('Digit', '')}</b>`,
          fontSize,
          textWrap: 'nowrap'
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
