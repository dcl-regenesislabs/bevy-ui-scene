import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import {
  type EquippedEmote,
  type URNWithoutTokenId
} from '../../../utils/definitions'
import { getEmoteName } from '../../../service/emotes'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { ZERO_ADDRESS } from '../../../utils/constants'
import { ItemsCatalog } from './ItemCatalog'
import { changeCategory } from '../../../service/wearable-category-service'
import { store } from '../../../state/store'
import Icon from '../../../components/icon/Icon'
import type { ItemElement } from '../../../utils/item-definitions'
import { CatalogGrid } from '../../../components/backpack/CatalogGrid'
import { getPlayer } from '@dcl/sdk/src/players'
import { fetchEmotesPage } from '../../../utils/emotes-promise-utils'
import {
  resetDefaultEmotesAction,
  resetEmotesAction,
  updateEquippedEmoteAction,
  updateSelectedCatalogURNAction
} from '../../../state/backpack/actions'
import { urnWithTokenIdMemo } from '../../../utils/urn-utils'
import { playPreviewEmote } from '../../../components/backpack/AvatarPreview'
import { EquippedEmoteList } from './EquippedEmoteList'
import { NavButton } from '../../../components/nav-button/NavButton'
import {
  DEFAULT_EMOTES,
  ITEMS_CATALOG_PAGE_SIZE
} from '../../../utils/backpack-constants'
import { Color4 } from '@dcl/sdk/math'
import { COLOR } from '../../../components/color-palette'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'

export function EmotesCatalog(): ReactElement {
  const backpackState = store.getState().backpack
  const canvasScaleRatio = getContentScaleRatio()
  const bottomButtonFontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity>
      <EquippedEmoteList equippedEmotes={backpackState.equippedEmotes} />
      <ItemsCatalog
        fetchItemsPage={async () => {
          const backpackState = store.getState().backpack

          return await fetchEmotesPage({
            pageNum: backpackState.currentPage,
            pageSize: ITEMS_CATALOG_PAGE_SIZE,
            address: getPlayer()?.userId ?? ZERO_ADDRESS,
            cacheKey: backpackState.cacheKey,
            searchFilter: backpackState.searchFilter
          })
        }}
      >
        <EmoteNavBar />
        <CatalogGrid
          uiTransform={{
            margin: { top: 20 * canvasScaleRatio }
          }}
          loading={backpackState.loadingPage}
          items={backpackState.shownEmotes}
          equippedItems={[
            backpackState.equippedEmotes[
              backpackState.selectedEmoteSlot
            ] as EquippedEmote
          ]}
          onChangeSelection={(selectedURN): void => {
            store.dispatch(
              updateSelectedCatalogURNAction(selectedURN as URNWithoutTokenId)
            )
            playPreviewEmote(selectedURN as EquippedEmote)
          }}
          onEquipItem={(itemElement: ItemElement): void => {
            urnWithTokenIdMemo.set(
              itemElement.urn as URNWithoutTokenId,
              itemElement.individualData[0].id
            )

            store.dispatch(
              updateEquippedEmoteAction({
                equippedEmote: itemElement.urn,
                slot: backpackState.selectedEmoteSlot
              })
            )
          }}
          onUnequipItem={(): void => {
            store.dispatch(
              updateEquippedEmoteAction({
                equippedEmote: '',
                slot: backpackState.selectedEmoteSlot
              })
            )
          }}
        />
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            width: '100%',
            position: { bottom: '1%', left: '-54%' },
            flexDirection: 'row'
          }}
        >
          {backpackState.changedEmotesFromResetVersion && (
            <NavButton
              icon={{ atlasName: 'icons', spriteName: 'BackStepIcon' }}
              text={'RESET EMOTES'}
              color={Color4.White()}
              backgroundColor={COLOR.SMALL_TAG_BACKGROUND}
              uiTransform={{
                height: '4%',
                padding: {
                  left: bottomButtonFontSize,
                  right: bottomButtonFontSize
                },
                flexWrap: 'nowrap',
                margin: { right: '1%' },
                width: 'auto'
              }}
              fontSize={bottomButtonFontSize}
              onClick={() => {
                resetEmotes()
              }}
            />
          )}

          {!areDefaultEmotes(backpackState.equippedEmotes) && (
            <NavButton
              text={'RESET DEFAULT EMOTES'}
              color={Color4.White()}
              backgroundColor={COLOR.SMALL_TAG_BACKGROUND}
              fontSize={bottomButtonFontSize}
              uiTransform={{
                height: '4%',
                padding: {
                  left: bottomButtonFontSize,
                  right: bottomButtonFontSize
                },
                flexWrap: 'nowrap',
                width: 'auto'
              }}
              onClick={() => {
                store.dispatch(resetDefaultEmotesAction())
                playPreviewEmote('')
              }}
            />
          )}
        </UiEntity>
      </ItemsCatalog>
    </UiEntity>
  )
}

function areDefaultEmotes(equippedEmotes: EquippedEmote[]): boolean {
  return equippedEmotes.join(',') === DEFAULT_EMOTES.join(',')
}

function resetEmotes(): void {
  store.dispatch(resetEmotesAction())
  playPreviewEmote('')
}

function EmoteNavBar(): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const backpackState = store.getState().backpack
  const slot = (backpackState.selectedEmoteSlot + 1) % 10
  return (
    <UiEntity uiTransform={{ flexDirection: 'row', width: '100%' }}>
      <NavButton
        active={!backpackState.equippedEmotes[backpackState.selectedEmoteSlot]}
        icon={{
          spriteName: `emote-circle-${slot}`,
          atlasName: 'backpack'
        }}
        text={`EMOTE ${slot}`}
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
          display: backpackState.equippedEmotes[backpackState.selectedEmoteSlot]
            ? 'flex'
            : 'none'
        }}
        icon={{
          spriteName: 'RightArrow',
          atlasName: 'icons'
        }}
      />
      <NavButton
        active={true}
        text={getEmoteName(
          backpackState.equippedEmotes[backpackState.selectedEmoteSlot]
        )?.toUpperCase()}
        uiTransform={{
          padding: 20 * canvasScaleRatio,

          display: backpackState.equippedEmotes[backpackState.selectedEmoteSlot]
            ? 'flex'
            : 'none'
        }}
      />
    </UiEntity>
  )
}
