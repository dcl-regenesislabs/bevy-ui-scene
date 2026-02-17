import { UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import type {
  EquippedEmote,
  offchainEmoteURN,
  URNWithoutTokenId
} from '../../utils/definitions'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import {
  type ItemElement,
  type CatalogEmoteElement,
  type CatalogWearableElement
} from '../../utils/item-definitions'
import { noop } from '../../utils/function-utils'
import { CatalogItem } from './CatalogItem'
import { COLOR } from '../color-palette'
import { Color4 } from '@dcl/sdk/math'
import Icon from '../icon/Icon'
import { openExternalUrl } from '~system/RestrictedActions'
import { store } from '../../state/store'
import { updateSelectedCatalogURNAction } from '../../state/backpack/actions'
import { CONTEXT, getFontSize } from '../../service/fontsize-system'

export type WearableCatalogGridProps = {
  items: CatalogWearableElement[] | CatalogEmoteElement[]
  equippedItems: Array<URNWithoutTokenId | EquippedEmote>
  uiTransform: UiTransformProps
  loading: boolean
  onChangeSelection?: (
    itemURN: URNWithoutTokenId | offchainEmoteURN | null
  ) => void
  onEquipItem: (itemElement: ItemElement) => void
  onUnequipItem: (itemElement: ItemElement) => void
}

const isEquippedMemo: {
  equippedItems: Array<URNWithoutTokenId | EquippedEmote>
  memo: Map<URNWithoutTokenId | offchainEmoteURN, boolean>
} = {
  equippedItems: [],
  memo: new Map()
}

export function CatalogGrid({
  items,
  equippedItems,
  uiTransform,
  loading,
  onChangeSelection = noop,
  onEquipItem = noop,
  onUnequipItem = noop
}: WearableCatalogGridProps): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  if (!items.length) {
    return (
      <UiEntity
        uiTransform={{
          padding: {
            left: 10 * canvasScaleRatio,
            right: 10 * canvasScaleRatio,
            top: 380 * canvasScaleRatio
          },
          flexWrap: 'wrap',
          width: 950 * canvasScaleRatio,
          flexDirection: 'column',
          justifyContent: 'center',
          ...uiTransform
        }}
      >
        <Icon
          uiTransform={{ alignSelf: 'center' }}
          iconSize={canvasScaleRatio * 200}
          icon={{ atlasName: 'backpack', spriteName: 'empty-search-result' }}
        />
        <UiEntity
          uiTransform={{
            margin: { top: canvasScaleRatio * 20 }
          }}
          uiText={{
            textAlign: 'middle-center',
            value: `You do not have any wearable that meets this category or search criteria.
If you want you can find the ideal one for you in the <color=${Color4.toHexString(
              COLOR.LINK_COLOR
            )}><u>Marketplace.</u></color>`,
            fontSize
          }}
        />
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: {
              top: canvasScaleRatio * 530,
              left: canvasScaleRatio * 640
            },
            height: 30,
            width: 200 * canvasScaleRatio
          }}
          uiBackground={{ color: Color4.create(0, 0, 0, 0) }}
          onMouseDown={linkToMarketPlace}
        />
      </UiEntity>
    )
  }
  return (
    <UiEntity
      uiTransform={{
        padding: 10 * canvasScaleRatio,
        width: 950 * canvasScaleRatio,
        flexWrap: 'wrap',
        ...uiTransform
      }}
    >
      {items.map(
        (
          itemElement: CatalogWearableElement | CatalogEmoteElement,
          index: number
        ) => (
          <CatalogItem
            key={index}
            itemElement={itemElement}
            onEquipItem={(itemElement: ItemElement) => {
              onEquipItem(itemElement)
            }}
            onUnequipItem={(itemElement: ItemElement) => {
              onUnequipItem(itemElement)
            }}
            onSelect={() => {
              if (isSelected(itemElement.urn)) return
              select(itemElement.urn)
              onChangeSelection(store.getState().backpack.selectedURN)
            }}
            isSelected={isSelected(itemElement?.urn)}
            isEquipped={isEquipped(itemElement, equippedItems)}
            loading={loading}
          />
        )
      )}
    </UiEntity>
  )
}

function isSelected(itemURN: URNWithoutTokenId | offchainEmoteURN): boolean {
  return store.getState().backpack.selectedURN === itemURN
}

function select(
  itemURNWithoutTokenId: null | URNWithoutTokenId | offchainEmoteURN
): void {
  store.dispatch(
    updateSelectedCatalogURNAction(itemURNWithoutTokenId as URNWithoutTokenId)
  )
}

function isEquipped(
  itemElement: ItemElement,
  equippedItems: Array<URNWithoutTokenId | EquippedEmote> = []
): boolean {
  if (itemElement === null) return false
  if (equippedItems !== isEquippedMemo.equippedItems) {
    isEquippedMemo.equippedItems = equippedItems
    isEquippedMemo.memo.clear()
  }
  if (isEquippedMemo.memo.has(itemElement.urn)) {
    return isEquippedMemo.memo.get(itemElement.urn) as boolean
  }
  const itemURN: URNWithoutTokenId | offchainEmoteURN = itemElement.urn
  const equipped = equippedItems.includes(itemURN)
  isEquippedMemo.memo.set(itemElement.urn, equipped)
  return equipped
}

function linkToMarketPlace(): void {
  openExternalUrl({ url: 'https://decentraland.org/marketplace/' }).catch(
    console.error
  )
}
