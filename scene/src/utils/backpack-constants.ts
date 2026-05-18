import type { EquippedEmote, offchainEmoteURN, URN } from './definitions'
import type { CatalogEmoteElement } from './item-definitions'

export const ITEMS_CATALOG_PAGE_SIZE = 16

export const BASE_EMOTES_URN_PREFIX = 'urn:decentraland:off-chain:base-emotes:'

// Source of truth: canonical short names. URNs and Record keys derive from
// these to keep them in sync and avoid manual duplication.
const BASE_EMOTE_SHORT_NAMES = [
  'handsair',
  'wave',
  'fistpump',
  'dance',
  'raisehand',
  'clap',
  'money',
  'kiss',
  'headexplode',
  'shrug'
] as const

const _displayNameByShort: Record<string, string> = {
  handsair: 'Hands air',
  wave: 'Wave',
  fistpump: 'Fist pump',
  dance: 'Dance',
  raisehand: 'Raisehand',
  clap: 'Clap',
  money: 'Money',
  kiss: 'Kiss',
  headexplode: 'Head explode',
  shrug: 'Shrug'
}

export const DEFAULT_EMOTES: offchainEmoteURN[] = BASE_EMOTE_SHORT_NAMES.map(
  (s) => `${BASE_EMOTES_URN_PREFIX}${s}` as offchainEmoteURN
)

export const EMPTY_EMOTES: EquippedEmote[] = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
]

// Records below accept BOTH the short name (`'wave'`) and the full URN
// (`'urn:…:wave'`) as keys. Old profiles persisted before the URN
// migration still hand us shorts via `getPlayer()?.emotes`; we want
// lookups to succeed either way.
export const DEFAULT_EMOTE_NAMES: Record<string, string> = {}
export const DEFAULT_EMOTE_SPRITE_NAMES: Record<string, string> = {}

for (const short of BASE_EMOTE_SHORT_NAMES) {
  const fullUrn = `${BASE_EMOTES_URN_PREFIX}${short}`
  DEFAULT_EMOTE_NAMES[short] = _displayNameByShort[short]
  DEFAULT_EMOTE_NAMES[fullUrn] = _displayNameByShort[short]
  DEFAULT_EMOTE_SPRITE_NAMES[short] = short
  DEFAULT_EMOTE_SPRITE_NAMES[fullUrn] = short
}
export const DEFAULT_EMOTE_ELEMENTS: CatalogEmoteElement[] = DEFAULT_EMOTES.map(
  (offchainEmoteURN: offchainEmoteURN) => ({
    amount: 1,
    category: 'dance',
    entity: {
      content: [],
      id: offchainEmoteURN,
      metadata: {
        collectionAddress: '',
        description: '',
        emoteDataADR74: {
          category: 'dance',
          loop: true,
          representations: [
            {
              bodyShapes: [],
              contents: [],
              mainFile: ''
            }
          ],
          tags: []
        },
        i18n: [],
        id: offchainEmoteURN,
        image: '',
        metrics: {
          triangles: 0,
          materials: 0,
          meshes: 0,
          textures: 0,
          bodies: 0,
          entities: 0
        },
        name: DEFAULT_EMOTE_NAMES[offchainEmoteURN],
        rarity: 'base',
        thumbnail: ''
      },
      pointers: [offchainEmoteURN as URN],
      timestamp: Date.now(),
      type: 'emote',
      version: '1'
    },
    individualData: [
      {
        id: offchainEmoteURN as URN,
        tokenId: '0',
        transferredAt: '0',
        price: '0'
      }
    ],
    name: DEFAULT_EMOTE_NAMES[offchainEmoteURN],
    rarity: 'base',
    urn: offchainEmoteURN
  })
)
