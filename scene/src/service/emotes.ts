import {
  type EquippedEmote,
  type offchainEmoteURN,
  type URNWithoutTokenId
} from '../utils/definitions'
import { type UiBackgroundProps } from '@dcl/react-ecs'
import { getBackgroundFromAtlas } from '../utils/ui-utils'

import {
  BASE_EMOTES_URN_PREFIX,
  DEFAULT_EMOTE_NAMES,
  DEFAULT_EMOTE_SPRITE_NAMES
} from '../utils/backpack-constants'
import { catalystMetadataMap } from '../utils/catalyst-metadata-map'

export function getEmoteName(
  emoteURN: offchainEmoteURN | URNWithoutTokenId | ``
): string {
  return (
    DEFAULT_EMOTE_NAMES[emoteURN] ??
    catalystMetadataMap[emoteURN as URNWithoutTokenId]?.name ??
    `<i><color=#ffffff66>none</color></i>`
  )
}

export function getEmoteThumbnail(urn: EquippedEmote): UiBackgroundProps {
  const urnStr = urn as string

  // Records in backpack-constants accept both short names (`'wave'`) and
  // full URNs (`'urn:…:wave'`), so old profiles persisted before the URN
  // migration still resolve.
  let spriteName: string | undefined = DEFAULT_EMOTE_SPRITE_NAMES[urnStr]

  // If a trailing token segment slipped through (e.g. `…:wave:0`), strip
  // it once and retry. Single indexOf + slice; no array allocation.
  if (spriteName === undefined && urnStr.startsWith(BASE_EMOTES_URN_PREFIX)) {
    const tokenIdx = urnStr.indexOf(':', BASE_EMOTES_URN_PREFIX.length)
    if (tokenIdx !== -1) {
      spriteName = DEFAULT_EMOTE_SPRITE_NAMES[urnStr.slice(0, tokenIdx)]
    }
  }

  if (spriteName !== undefined) {
    return getBackgroundFromAtlas({ atlasName: 'emotes', spriteName })
  }
  return {
    texture: {
      src: `https://peer.decentraland.org/lambdas/collections/contents/${urnStr}/thumbnail`
    },
    textureMode: 'stretch'
  }
}
