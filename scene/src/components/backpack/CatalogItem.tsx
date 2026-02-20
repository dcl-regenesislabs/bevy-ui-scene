import { Label, UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import type { ItemElement } from '../../utils/item-definitions'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { noop } from '../../utils/function-utils'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import {
  DOUBLE_CLICK_DELAY,
  ROUNDED_TEXTURE_BACKGROUND
} from '../../utils/constants'
import { COLOR } from '../color-palette'
import { getBackgroundFromAtlas } from '../../utils/ui-utils'
import Icon from '../icon/Icon'
import {
  type offchainEmoteURN,
  type URNWithoutTokenId
} from '../../utils/definitions'
import { DEFAULT_EMOTES } from '../../utils/backpack-constants'
import { RoundedButton } from '../rounded-button'
import { CONTEXT, getFontSize } from '../../service/fontsize-system'

const SELECTED_BACKGROUND = getBackgroundFromAtlas({
  atlasName: 'backpack',
  spriteName: 'catalog-selection-frame'
})

const LOADING_TEXTURE_PROPS = getBackgroundFromAtlas({
  atlasName: 'backpack',
  spriteName: 'loading-wearable'
})

type CatalogItemProps = {
  uiTransform?: UiTransformProps
  key: number
  isEquipped: boolean
  isSelected: boolean
  loading: boolean
  itemElement: ItemElement
  onUnequipItem?: (itemElement: ItemElement) => void
  onEquipItem?: (itemElement: ItemElement) => void
  onSelect?: () => void
}
const state: {
  hoveredURN: URNWithoutTokenId | offchainEmoteURN | null
  lastTimeClick: number
  lastElementClick: ItemElement | null
} = { hoveredURN: null, lastTimeClick: 0, lastElementClick: null }

export function CatalogItem(props: CatalogItemProps): ReactElement {
  const {
    isEquipped,
    isSelected,
    onSelect = noop,
    loading = true,
    itemElement,
    onUnequipItem = noop,
    onEquipItem = noop,
    uiTransform
  } = props
  const canvasScaleRatio = getContentScaleRatio()
  const mustShowEquippedBorder = (): boolean =>
    !loading && isEquipped && !isSelected
  const mustShowSelectedOverlay = (): boolean => isSelected && !loading
  const isHovered = (): boolean => state.hoveredURN === itemElement?.urn
  return (
    <UiEntity
      uiTransform={{
        width: 210 * canvasScaleRatio,
        height: 210 * canvasScaleRatio,
        margin: 10 * canvasScaleRatio,
        padding: 8 * canvasScaleRatio,
        zIndex: isSelected ? 1 : 0,
        ...uiTransform
      }}
      onMouseDown={() => {
        if (
          state.lastTimeClick + DOUBLE_CLICK_DELAY > Date.now() &&
          state.lastElementClick === itemElement
        ) {
          onEquipItem(itemElement)
        } else {
          state.lastTimeClick = Date.now()
          state.lastElementClick = itemElement
          onSelect()
        }
      }}
      onMouseEnter={() => {
        state.hoveredURN = itemElement?.urn ?? null
      }}
      onMouseLeave={() => {
        if (!(state.hoveredURN && state.hoveredURN !== itemElement.urn)) {
          state.hoveredURN = null
        }
      }}
    >
      {mustShowEquippedBorder() && <EquippedBorder />}
      {isHovered() && <HoverBorder />}
      {!isSelected && (
        <ItemCellThumbnail
          uiTransform={{ width: '100%', height: '100%' }}
          itemElement={itemElement}
          loading={loading}
        />
      )}
      {mustShowSelectedOverlay() && (
        <SelectedItemOverlay
          itemElement={itemElement}
          isEquipped={isEquipped}
          onEquipItem={onEquipItem}
          onUnequipItem={onUnequipItem}
        />
      )}
    </UiEntity>
  )
}

function HoverBorder(): ReactElement | null {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        width: '105%',
        height: '100%',
        position: { top: '-2%', left: '-2%' }
      }}
      uiBackground={{
        ...getBackgroundFromAtlas({
          spriteName: 'hover-item',
          atlasName: 'backpack'
        })
      }}
    />
  )
}

function EquippedBorder(): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        width: '100%',
        height: '95%',
        position: { top: 0, left: 0 }
      }}
      uiBackground={{
        ...ROUNDED_TEXTURE_BACKGROUND,
        texture: { src: 'assets/images/backgrounds/rounded-border.png' },
        color: COLOR.ACTIVE_BACKGROUND_COLOR
      }}
    />
  )
}

type ItemCellProps = {
  loading: boolean
  itemElement: ItemElement
  uiTransform?: UiTransformProps
}

function ItemCellThumbnail({
  loading,
  itemElement,
  uiTransform
}: ItemCellProps): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  return (
    <UiEntity
      uiTransform={{
        width: canvasScaleRatio * 180,
        height: canvasScaleRatio * 180,
        ...uiTransform
      }}
      uiBackground={
        loading
          ? LOADING_TEXTURE_PROPS
          : getBackgroundFromAtlas({
              spriteName: `rarity-background-${itemElement?.rarity ?? 'base'}`,
              atlasName: 'backpack'
            })
      }
    >
      {!loading && itemElement?.urn && <ItemImage itemElement={itemElement} />}
      {itemElement?.individualData?.length > 1 && (
        <UiEntity
          uiTransform={{
            alignSelf: 'flex-end',
            margin: { right: '2%', bottom: '8%' }
          }}
          uiBackground={{
            ...ROUNDED_TEXTURE_BACKGROUND,
            color: COLOR.SMALL_TAG_BACKGROUND
          }}
        >
          <Label textWrap={'nowrap'} value={`${itemElement.amount}X`} />
        </UiEntity>
      )}
    </UiEntity>
  )
}

function ItemImage({
  itemElement
}: {
  itemElement: ItemElement
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{ width: '95%', height: '95%' }}
      uiBackground={
        DEFAULT_EMOTES.includes(itemElement.urn as offchainEmoteURN)
          ? getBackgroundFromAtlas({
              spriteName: itemElement.urn,
              atlasName: 'emotes'
            })
          : {
              texture: {
                src: `https://peer.decentraland.org/lambdas/collections/contents/${
                  itemElement.urn as string
                }/thumbnail`
              },
              textureMode: 'stretch'
            }
      }
    >
      <UiEntity
        uiTransform={{ width: '50%', height: '50%', positionType: 'absolute' }}
        uiBackground={getBackgroundFromAtlas({
          atlasName: 'backpack',
          spriteName: `rarity-corner-${itemElement.rarity ?? 'base'}`
        })}
      >
        <Icon
          uiTransform={{ margin: { top: '5%', left: '8%' } }}
          iconSize={'40%'}
          icon={{
            atlasName: 'backpack',
            spriteName: `category-${itemElement.category}`
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}

type SelectedItemOverlayProps = {
  itemElement: ItemElement
  isEquipped: boolean
  onEquipItem: (w: ItemElement) => void
  onUnequipItem: (w: ItemElement) => void
}

function SelectedItemOverlay({
  itemElement,
  isEquipped,
  onEquipItem,
  onUnequipItem
}: SelectedItemOverlayProps): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        width: canvasScaleRatio * 260,
        height: canvasScaleRatio * 320,
        positionType: 'absolute',
        position: { top: -16 * canvasScaleRatio, left: -23 * canvasScaleRatio },
        padding: {
          top: 24 * canvasScaleRatio,
          left: 24 * canvasScaleRatio,
          bottom: 24 * canvasScaleRatio
        },
        zIndex: 3,
        flexDirection: 'column',
        pointerFilter: 'none'
      }}
      uiBackground={SELECTED_BACKGROUND}
    >
      <ItemCellThumbnail
        uiTransform={{
          width: canvasScaleRatio * 210,
          height: canvasScaleRatio * 210
        }}
        itemElement={itemElement}
        loading={false}
      />
      <RoundedButton
        uiTransform={{
          margin: { top: 9 * canvasScaleRatio, left: 1 },
          width: 206 * canvasScaleRatio,
          height: 60 * canvasScaleRatio
        }}
        fontSize={fontSize}
        text={isEquipped ? 'UNEQUIP' : 'EQUIP'}
        isSecondary={isEquipped}
        onClick={() => {
          isEquipped ? onUnequipItem?.(itemElement) : onEquipItem?.(itemElement)
        }}
      />
    </UiEntity>
  )
}
