import { type Key, UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import {
  WEARABLE_CATEGORY_DEFINITIONS,
  type WearableCategory
} from '../../service/categories'
import ReactEcs, {
  type ReactElement,
  type UiBackgroundProps
} from '@dcl/react-ecs'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { Color4 } from '@dcl/sdk/math'
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import type { AtlasIcon, URNWithoutTokenId } from '../../utils/definitions'
import { noop } from '../../utils/function-utils'
import { getBackgroundFromAtlas } from '../../utils/ui-utils'
import { ROUNDED_TEXTURE_BACKGROUND } from '../../utils/constants'
import { store } from '../../state/store'
import {
  switchForceRenderCategory,
  unequipWearableCategory
} from '../../state/backpack/actions'
import { updateAvatarPreview } from './AvatarPreview'
import { catalystMetadataMap } from '../../utils/catalyst-metadata-map'

type WearableCategoryButtonProps = {
  uiTransform?: UiTransformProps
  category: WearableCategory
  active?: boolean
  onClick?: () => void
  selectedURN: URNWithoutTokenId | null
  forceRender?: boolean
  showForceRender?: boolean
  key?: Key
}

const state: { hoveredCategory: null | WearableCategory } = {
  hoveredCategory: null
}
const BACKGROUND_AND_SHADOW_HEIGHT = 127
const BACKGROUND_WIDTH = 120
const THUMBNAIL_HEIGHT_RATIO = BACKGROUND_AND_SHADOW_HEIGHT / BACKGROUND_WIDTH
export function WearableCategoryButton({
  category,
  uiTransform,
  active,
  onClick = noop,
  selectedURN,
  forceRender = false,
  showForceRender = true
}: WearableCategoryButtonProps): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const categoryIcon: AtlasIcon = {
    spriteName: `category-${category}`,
    atlasName: 'backpack'
  }
  const iconSize = 68 * canvasScaleRatio
  const thumbnailSize = 108 * canvasScaleRatio
  const textureProps: UiBackgroundProps = selectedURN
    ? getWearableThumbnailBackground(selectedURN)
    : getBackgroundFromAtlas({
        atlasName: 'backpack',
        spriteName: 'empty-wearable-field'
      })
  const isHovered = (): boolean => state.hoveredCategory === category
  return (
    <UiEntity
      uiTransform={{
        ...uiTransform,
        width: 239 * canvasScaleRatio,
        height: 133 * canvasScaleRatio,
        margin: {
          left: 20 * canvasScaleRatio,
          bottom: 12 * canvasScaleRatio
        },
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: 4 * canvasScaleRatio
      }}
      uiBackground={{
        ...ROUNDED_TEXTURE_BACKGROUND,
        color: active ? COLOR.ACTIVE_BACKGROUND_COLOR : COLOR.DARK_OPACITY_2
      }}
      onMouseDown={() => {
        onClick()
      }}
      onMouseEnter={() => {
        state.hoveredCategory = category
      }}
      onMouseLeave={() => {
        if (!(state.hoveredCategory && state.hoveredCategory !== category)) {
          state.hoveredCategory = null
        }
      }}
    >
      <Icon icon={categoryIcon} iconSize={iconSize} />

      <UiEntity
        uiTransform={{
          width: 116 * canvasScaleRatio,
          height: 116 * canvasScaleRatio * THUMBNAIL_HEIGHT_RATIO,
          display: selectedURN === null ? 'none' : 'flex',
          positionType: 'absolute',
          position: {
            left: 112 * canvasScaleRatio
          }
        }}
        uiBackground={getBackgroundFromAtlas({
          atlasName: 'backpack',
          spriteName: `rarity-background-${
            catalystMetadataMap[selectedURN as URNWithoutTokenId]?.rarity ??
            'base'
          }`
        })}
      />
      {isHovered() && <HoveredSquare selectedURN={selectedURN} />}
      <UiEntity
        uiTransform={{
          width: thumbnailSize,
          height: thumbnailSize,
          position: {
            left: 6 * canvasScaleRatio
          },
          zIndex: 2
        }}
        uiBackground={{
          ...textureProps
        }}
      >
        {selectedURN &&
          category === state.hoveredCategory &&
          category !== WEARABLE_CATEGORY_DEFINITIONS.body_shape.id && (
            <UnequipButton category={category} />
          )}

        {(forceRender || showForceRender) && (
          <ForceRenderButton category={category} forceRender={forceRender} />
        )}
        <UiEntity />
      </UiEntity>
    </UiEntity>
  )
}

function UnequipButton({
  category
}: {
  category: WearableCategory
}): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  return (
    <UiEntity
      uiTransform={{
        width: canvasScaleRatio * 36,
        height: canvasScaleRatio * 36,
        flexShrink: 0,
        positionType: 'absolute',
        position: { right: 0, top: '1%' },
        padding: '10%',
        alignItems: 'center',
        justifyContent: 'center',
        pointerFilter: 'none'
      }}
      uiBackground={{
        ...ROUNDED_TEXTURE_BACKGROUND,
        color: COLOR.TEXT_COLOR
      }}
      onMouseEnter={() => {
        state.hoveredCategory = category
      }}
      onMouseDown={() => {
        store.dispatch(unequipWearableCategory(category))
        updateAvatarPreview(
          store.getState().backpack.equippedWearables,
          store.getState().backpack.outfitSetup.base,
          store.getState().backpack.forceRender
        )
      }}
    >
      <Icon
        iconSize={canvasScaleRatio * 26}
        uiTransform={{ alignSelf: 'center', flexShrink: 0 }}
        icon={{ atlasName: 'icons', spriteName: 'CloseIcon' }}
      />
    </UiEntity>
  )
}

function ForceRenderButton({
  category,
  forceRender
}: {
  category: WearableCategory
  forceRender: boolean
}): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        height: '40%',
        width: '40%',
        position: {
          right: '-14%',
          bottom: '-14%'
        },
        zIndex: 2
      }}
      uiBackground={{
        ...ROUNDED_TEXTURE_BACKGROUND,
        color: Color4.fromHexString('#4E0E78')
      }}
      onMouseDown={() => {
        store.dispatch(switchForceRenderCategory(category))
        updateAvatarPreview(
          store.getState().backpack.equippedWearables,
          store.getState().backpack.outfitSetup.base,
          store.getState().backpack.forceRender
        )
      }}
    >
      <UiEntity
        uiTransform={{
          width: '90%',
          height: '90%',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        uiBackground={{
          ...ROUNDED_TEXTURE_BACKGROUND,
          color: Color4.White()
        }}
      >
        <Icon
          icon={{
            atlasName: 'icons',
            spriteName: forceRender ? 'PreviewIcon' : 'HideUIIcon'
          }}
          iconSize={32 * canvasScaleRatio}
          iconColor={forceRender ? Color4.Green() : Color4.Red()}
          uiTransform={{ flexShrink: 0 }}
        />
      </UiEntity>
    </UiEntity>
  )
}

function HoveredSquare({
  selectedURN
}: {
  selectedURN: URNWithoutTokenId | null
}): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const transform: UiTransformProps = selectedURN
    ? {
        width: 126 * canvasScaleRatio,
        height: 125 * canvasScaleRatio,
        positionType: 'absolute',
        position: {
          left: 108 * canvasScaleRatio,
          top: 0
        },
        zIndex: 1
      }
    : {
        width: 117 * canvasScaleRatio,
        height: 117 * canvasScaleRatio,
        positionType: 'absolute',
        position: {
          left: 112 * canvasScaleRatio
        },
        zIndex: 1
      }
  return (
    <UiEntity
      uiTransform={transform}
      uiBackground={getBackgroundFromAtlas({
        atlasName: 'backpack',
        spriteName: 'category-button-hover'
      })}
    />
  )
}
function getWearableThumbnailBackground(
  selectedURN: URNWithoutTokenId
): UiBackgroundProps {
  return {
    texture: {
      src: `https://peer.decentraland.org/lambdas/collections/contents/${selectedURN}/thumbnail`
    },
    textureMode: 'stretch'
  }
}
