import { BACKPACK_SECTION, type BackpackPageState } from './state'
import { BACKPACK_ACTION, type BackpackActions } from './actions'
import { getOutfitSetupFromWearables } from '../../service/outfit'
import { store } from '../store'

import { type WearableCategory } from '../../service/categories'
import { type PBAvatarBase } from '../../bevy-api/interface'
import {
  type EquippedEmote,
  type URNWithoutTokenId
} from '../../utils/definitions'
import { cloneDeep } from '../../utils/function-utils'
import { catalystMetadataMap } from '../../utils/catalyst-metadata-map'
import { DEFAULT_EMOTES } from '../../utils/backpack-constants'

export function reducer(
  backpackPageState: BackpackPageState,
  action: BackpackActions
): BackpackPageState {
  switch (action.type) {
    case BACKPACK_ACTION.UPDATE_STATE:
      return { ...backpackPageState, ...action.payload }
    case BACKPACK_ACTION.UPDATE_CURRENT_PAGE:
      return { ...backpackPageState, currentPage: action.payload }
    case BACKPACK_ACTION.SELECT_CATALOG_URN:
      return { ...backpackPageState, selectedURN: action.payload }
    case BACKPACK_ACTION.UPDATE_ACTIVE_WEARABLE_CATEGORY:
      return {
        ...backpackPageState,
        activeWearableCategory: action.payload,
        currentPage: 1
      }
    case BACKPACK_ACTION.UPDATE_LOADING_PAGE:
      return {
        ...backpackPageState,
        loadingPage: action.payload
      }
    case BACKPACK_ACTION.UPDATE_LOADED_PAGE: {
      const key =
        backpackPageState.activeSection === BACKPACK_SECTION.WEARABLES
          ? 'shownWearables'
          : 'shownEmotes'
      return {
        ...backpackPageState,
        totalPages: action.payload.totalPages,
        [key]: action.payload.elements,
        loadingPage: false
      }
    }

    case BACKPACK_ACTION.UPDATE_EQUIPPED_WEARABLES: {
      const equippedItems = gatherEquippedItems({
        base: backpackPageState.outfitSetup.base,
        equippedWearables: action.payload.wearables,
        equippedEmotes: backpackPageState.equippedEmotes
      })
      return {
        ...backpackPageState,
        equippedWearables: action.payload.wearables,
        outfitSetup: {
          ...backpackPageState.outfitSetup,
          wearables: {
            ...backpackPageState.outfitSetup.wearables,
            ...getOutfitSetupFromWearables(
              action.payload.wearables,
              action.payload.wearablesData
            )
          }
        },
        changedFromResetVersion: true,
        equippedItems
      }
    }
    case BACKPACK_ACTION.UPDATE_AVATAR_BASE: {
      const base = {
        ...backpackPageState.outfitSetup.base,
        ...action.payload
      }
      const equippedItems = gatherEquippedItems({
        base,
        equippedWearables: backpackPageState.equippedWearables,
        equippedEmotes: backpackPageState.equippedEmotes
      })
      return {
        ...backpackPageState,
        outfitSetup: {
          ...backpackPageState.outfitSetup,
          base
        },
        changedFromResetVersion: true,
        equippedItems
      }
    }
    case BACKPACK_ACTION.UPDATE_CACHE_KEY:
      return {
        ...backpackPageState,
        cacheKey: Date.now().toString()
      }
    case BACKPACK_ACTION.SWITCH_FORCE_RENDER_CATEGORY:
      return {
        ...backpackPageState,
        forceRender: backpackPageState.forceRender.includes(action.payload)
          ? backpackPageState.forceRender.filter((i) => i !== action.payload)
          : [...backpackPageState.forceRender, action.payload],
        changedFromResetVersion: true
      }
    case BACKPACK_ACTION.UPDATE_SAVED_RESET_VERSION:
      return {
        ...backpackPageState,
        savedResetOutfit: {
          base: cloneDeep(store.getState().backpack.outfitSetup.base),
          equippedWearables: cloneDeep(
            store.getState().backpack.equippedWearables
          ),
          forceRender: [...store.getState().backpack.forceRender]
        },
        changedFromResetVersion: false
      }
    case BACKPACK_ACTION.RESET_OUTFIT: {
      const base: PBAvatarBase = cloneDeep(
        backpackPageState.savedResetOutfit.base
      )
      const equippedWearables = [
        ...backpackPageState.savedResetOutfit.equippedWearables
      ]
      const equippedItems = gatherEquippedItems({
        base,
        equippedWearables,
        equippedEmotes: backpackPageState.equippedEmotes
      })
      return {
        ...backpackPageState,
        outfitSetup: {
          ...backpackPageState.outfitSetup,
          base,
          wearables: getOutfitSetupFromWearables(
            backpackPageState.savedResetOutfit.equippedWearables,
            catalystMetadataMap
          )
        },
        forceRender: [...backpackPageState.savedResetOutfit.forceRender],
        equippedWearables,
        changedFromResetVersion: false,
        equippedItems
      }
    }
    case BACKPACK_ACTION.UPDATE_EMOTES_SAVED_RESET_VERSION: {
      return {
        ...backpackPageState,
        savedResetEmotes: cloneDeep(backpackPageState.equippedEmotes),
        changedEmotesFromResetVersion: false
      }
    }
    case BACKPACK_ACTION.RESET_EMOTES: {
      return {
        ...backpackPageState,
        equippedEmotes: cloneDeep(backpackPageState.savedResetEmotes),
        changedEmotesFromResetVersion: false
      }
    }
    case BACKPACK_ACTION.UNEQUIP_WEARABLE_CATEGORY: {
      const equippedWearables = backpackPageState.equippedWearables.filter(
        (equippedWearable) =>
          equippedWearable !==
          backpackPageState.outfitSetup.wearables[
            action.payload as WearableCategory
          ]
      )
      return {
        ...backpackPageState,
        outfitSetup: {
          ...backpackPageState.outfitSetup,
          wearables: {
            ...backpackPageState.outfitSetup.wearables,
            [action.payload]: null
          }
        },
        equippedWearables,
        equippedItems: gatherEquippedItems({
          base: backpackPageState.outfitSetup.base,
          equippedWearables,
          equippedEmotes: backpackPageState.equippedEmotes
        })
      }
    }
    case BACKPACK_ACTION.CHANGE_SECTION: {
      return {
        ...backpackPageState,
        activeSection: action.payload,
        currentPage: 1,
        selectedURN: null
      }
    }
    case BACKPACK_ACTION.UPDATE_EQUIPPED_EMOTES: {
      return {
        ...backpackPageState,
        equippedEmotes: action.payload,
        changedEmotesFromResetVersion: false,
        savedResetEmotes: cloneDeep(action.payload)
      }
    }
    case BACKPACK_ACTION.UPDATE_EQUIPPED_EMOTE: {
      const newEquippedEmotes = [...backpackPageState.equippedEmotes]
      newEquippedEmotes[action.payload.slot] = action.payload.equippedEmote
      return {
        ...backpackPageState,
        equippedEmotes: newEquippedEmotes,
        changedEmotesFromResetVersion: true
      }
    }
    case BACKPACK_ACTION.SELECT_EMOTE_SLOT: {
      return {
        ...backpackPageState,
        selectedEmoteSlot: action.payload
      }
    }
    case BACKPACK_ACTION.RESET_DEFAULT_EMOTES: {
      return {
        ...backpackPageState,
        equippedEmotes: DEFAULT_EMOTES.slice(0, 10),
        changedEmotesFromResetVersion: true
      }
    }
    case BACKPACK_ACTION.UPDATE_SEARCH_FILTER: {
      return {
        ...backpackPageState,
        searchFilter: {
          ...backpackPageState.searchFilter,
          ...action.payload
        },
        currentPage: 1
      }
    }
    case BACKPACK_ACTION.LOADED_OUTFITS_METADATA: {
      return {
        ...backpackPageState,
        outfitsMetadata: action.payload
      }
    }
    case BACKPACK_ACTION.UPDATE_FORCE_RENDER: {
      return {
        ...backpackPageState,
        forceRender: action.payload
      }
    }
    default:
      return backpackPageState
  }
}

function gatherEquippedItems({
  base,
  equippedWearables,
  equippedEmotes
}: {
  base: PBAvatarBase
  equippedWearables: URNWithoutTokenId[]
  equippedEmotes: EquippedEmote[]
}): EquippedEmote[] {
  return [base.bodyShapeUrn, ...equippedWearables, ...equippedEmotes].filter(
    (i) => i
  )
}
