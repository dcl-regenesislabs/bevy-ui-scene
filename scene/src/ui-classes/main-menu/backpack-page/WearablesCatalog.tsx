import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { ItemsCatalog } from './ItemCatalog'
import { store } from '../../../state/store'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import {
  categoryHasColor,
  type EmoteCategory,
  WEARABLE_CATEGORY_DEFINITIONS,
  type WearableCategory
} from '../../../service/categories'
import { NavButton } from '../../../components/nav-button/NavButton'
import { changeCategory } from '../../../service/wearable-category-service'
import Icon from '../../../components/icon/Icon'
import { WearableColorPicker } from './WearableColorPicker'
import type { URNWithoutTokenId } from '../../../utils/definitions'
import {
  resetOutfitAction,
  updateAvatarBase,
  updateEquippedWearables,
  updateSelectedCatalogURNAction
} from '../../../state/backpack/actions'
import type { ItemElement } from '../../../utils/item-definitions'
import {
  BASE_FEMALE_URN,
  BASE_MALE_URN,
  urnWithTokenIdMemo
} from '../../../utils/urn-utils'
import { CatalogGrid } from '../../../components/backpack/CatalogGrid'
import {
  fetchWearablesData,
  fetchWearablesPage
} from '../../../utils/wearables-promise-utils'
import { Color4 } from '@dcl/sdk/math'
import { COLOR } from '../../../components/color-palette'
import { WearableCategoryList } from '../../../components/backpack/WearableCategoryList'
import {
  CATALYST_BASE_URL_FALLBACK,
  ZERO_ADDRESS
} from '../../../utils/constants'
import { getPlayer } from '@dcl/sdk/src/players'
import { getRealm } from '~system/Runtime'
import { ITEMS_CATALOG_PAGE_SIZE } from '../../../utils/backpack-constants'
import { catalystMetadataMap } from '../../../utils/catalyst-metadata-map'

export function WearablesCatalog(): ReactElement {
  const backpackState = store.getState().backpack
  const canvasScaleRatio = getContentScaleRatio()
  return (
    <UiEntity>
      <WearableCategoryList
        outfitSetup={backpackState.outfitSetup}
        activeCategory={backpackState.activeWearableCategory}
        onSelectCategory={(category: WearableCategory | null): void => {
          if (!backpackState.loadingPage) changeCategory(category)
        }}
      />
      <ItemsCatalog
        fetchItemsPage={async () => {
          const backpackState = store.getState().backpack
          return await fetchWearablesPage(
            (await getRealm({}))?.realmInfo?.baseUrl ??
              CATALYST_BASE_URL_FALLBACK
          )({
            pageNum: backpackState.currentPage,
            pageSize: ITEMS_CATALOG_PAGE_SIZE,
            address: getPlayer()?.userId ?? ZERO_ADDRESS,
            wearableCategory: backpackState.activeWearableCategory,
            cacheKey: backpackState.cacheKey,
            searchFilter: backpackState.searchFilter
          })
        }}
      >
        <WearableCatalogNavBar />
        <CatalogGrid
          uiTransform={{
            margin: { top: 20 * canvasScaleRatio }
          }}
          loading={backpackState.loadingPage}
          items={backpackState.shownWearables}
          equippedItems={backpackState.equippedItems}
          onChangeSelection={(selectedURN): void => {
            store.dispatch(
              updateSelectedCatalogURNAction(selectedURN as URNWithoutTokenId)
            )
          }}
          onEquipItem={(itemElement: ItemElement): void => {
            urnWithTokenIdMemo.set(
              itemElement.urn as URNWithoutTokenId,
              itemElement.individualData[0].id
            )
            updateEquippedWearable(
              itemElement.category,
              itemElement.urn as URNWithoutTokenId
            ).catch(console.error)
          }}
          onUnequipItem={(wearable: ItemElement): void => {
            updateEquippedWearable(wearable.category, null).catch(console.error)
          }}
        />
        {backpackState.changedFromResetVersion && (
          <NavButton
            icon={{ atlasName: 'icons', spriteName: 'BackStepIcon' }}
            text={'RESET OUTFIT'}
            color={Color4.White()}
            backgroundColor={COLOR.SMALL_TAG_BACKGROUND}
            uiTransform={{
              positionType: 'absolute',
              height: '5%',
              padding: { left: '1%', right: '2%' },
              position: { bottom: '1%', left: '-54%' }
            }}
            onClick={() => {
              resetOutfit().catch(console.error)
            }}
          />
        )}
      </ItemsCatalog>
    </UiEntity>
  )
}
async function resetOutfit(): Promise<void> {
  store.dispatch(resetOutfitAction())
}
function WearableCatalogNavBar(): ReactElement {
  const backpackState = store.getState().backpack
  const canvasScaleRatio = getContentScaleRatio()
  const mustShowColor = categoryHasColor(backpackState.activeWearableCategory)

  return (
    <UiEntity uiTransform={{ flexDirection: 'row', width: '100%', zIndex: 1 }}>
      <NavButton
        active={backpackState.activeWearableCategory === null}
        icon={{ spriteName: 'all', atlasName: 'backpack' }}
        text={'ALL'}
        uiTransform={{ padding: 40 * canvasScaleRatio }}
        onClick={() => {
          if (backpackState.activeWearableCategory === null) return null
          changeCategory(null)
        }}
      />
      <Icon
        iconSize={40 * canvasScaleRatio}
        uiTransform={{
          alignSelf: 'center',
          margin: {
            left: 16 * canvasScaleRatio,
            right: 16 * canvasScaleRatio
          },
          display:
            backpackState.activeWearableCategory === null ? 'none' : 'flex'
        }}
        icon={{
          spriteName: 'RightArrow',
          atlasName: 'icons'
        }}
      />
      {backpackState.activeWearableCategory && (
        <NavButton
          active={true}
          showDeleteButton={true}
          onDelete={() => {
            changeCategory(null)
          }}
          icon={{
            spriteName: `category-${backpackState.activeWearableCategory}`,
            atlasName: 'backpack'
          }}
          text={
            WEARABLE_CATEGORY_DEFINITIONS[backpackState.activeWearableCategory]
              .label
          }
          uiTransform={{
            padding: 20 * canvasScaleRatio,
            height: 80 * canvasScaleRatio
          }}
        />
      )}
      {mustShowColor && <WearableColorPicker />}
    </UiEntity>
  )
}

async function updateEquippedWearable(
  category: WearableCategory | EmoteCategory,
  wearableURN: URNWithoutTokenId | null
): Promise<void> {
  const backpackState = store.getState().backpack
  if (category === WEARABLE_CATEGORY_DEFINITIONS.body_shape.id) {
    if (wearableURN === null) {
      store.dispatch(
        updateAvatarBase({
          ...backpackState.outfitSetup.base,
          bodyShapeUrn:
            store.getState().backpack.outfitSetup.base.bodyShapeUrn ===
            BASE_MALE_URN
              ? BASE_FEMALE_URN
              : BASE_MALE_URN
        })
      )
    } else {
      store.dispatch(
        updateAvatarBase({
          ...backpackState.outfitSetup.base,
          bodyShapeUrn: wearableURN
        })
      )
    }
  } else {
    const equippedWearablesWithoutPrevious =
      backpackState.equippedWearables.filter(
        (wearableURN) =>
          wearableURN !==
          backpackState.outfitSetup.wearables[category as WearableCategory]
      )

    const wearables =
      wearableURN === null
        ? equippedWearablesWithoutPrevious
        : [...equippedWearablesWithoutPrevious, wearableURN]
    await fetchWearablesData(
      (await getRealm({}))?.realmInfo?.baseUrl ??
        'https://peer.decentraland.org'
    )(...(wearables ?? []))
    store.dispatch(
      updateEquippedWearables({
        wearables,
        wearablesData: catalystMetadataMap
      })
    )
  }
}
