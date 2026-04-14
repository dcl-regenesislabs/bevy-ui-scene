import { getContentScaleRatio } from '../service/canvas-ratio'
import ReactEcs, {
  UiEntity,
  type UiTransformProps,
  type Key
} from '@dcl/sdk/react-ecs'
import { getBackgroundFromAtlas } from '../utils/ui-utils'
import { COLOR } from './color-palette'
import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'
import { type Color4 } from '@dcl/sdk/math'
import { ONE_ADDRESS, ZERO_ADDRESS } from '../utils/constants'
import { type ReactElement } from '@dcl/react-ecs'
import { noop } from '../utils/function-utils'

export function AvatarCircle({
  userId,
  circleColor,
  uiTransform,
  isGuest,
  onMouseDown = noop,
  imageSrc,
  key
}: {
  userId: string
  circleColor: Color4
  uiTransform: UiTransformProps
  isGuest: boolean
  onMouseDown?: () => void
  imageSrc?: string
  key?: Key
}): ReactElement | null {
  const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (canvasInfo === null) return null
  const addressColor = circleColor
  return (
    <UiEntity
      uiTransform={{
        width: getContentScaleRatio() * 64,
        height: getContentScaleRatio() * 64,
        flexShrink: 0,
        justifyContent: 'center',
        alignItems: 'center',
        /*      margin:
        props.message.sender_address === myPlayer.userId
          ? { left: canvasInfo.width * 0.005 }
          : { right: canvasInfo.width * 0.005 }, */
        borderRadius: 999,
        borderWidth: getContentScaleRatio() * 3,
        borderColor: addressColor,
        ...uiTransform
      }}
      uiBackground={{
        color: { ...addressColor, a: 0.3 }
      }}
      onMouseDown={onMouseDown}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          borderRadius: 999,
          borderWidth: 0,
          borderColor: COLOR.BLACK_TRANSPARENT
        }}
        uiBackground={
          imageSrc?.length
            ? { textureMode: 'stretch', texture: { src: imageSrc } }
            : userId === ZERO_ADDRESS || userId === ONE_ADDRESS
            ? getBackgroundFromAtlas({
                atlasName: 'icons',
                spriteName: 'DdlIconColor'
              })
            : isGuest
            ? {
                ...getBackgroundFromAtlas({
                  atlasName: 'icons', // TODO review to use guest real avatar profile image, for which avatarTexture don't work, review how unity explorer does for guests
                  spriteName: 'Members'
                }),
                color: COLOR.WHITE_OPACITY_2
              }
            : {
                textureMode: 'stretch',
                avatarTexture: {
                  userId
                }
              }
        }
      />
    </UiEntity>
  )
}
