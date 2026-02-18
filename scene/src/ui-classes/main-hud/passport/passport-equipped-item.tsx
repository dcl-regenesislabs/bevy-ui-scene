import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { COLOR, RARITY_COLORS } from '../../../components/color-palette'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import {
  getBackgroundFromAtlas,
  truncateWithoutBreakingWords
} from '../../../utils/ui-utils'
import { Tag } from '../../../components/color-tag'
import {
  type EmoteEntityMetadata,
  type RarityName,
  type WearableEntityMetadata
} from '../../../utils/item-definitions'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'

export function PassportEquippedItem({
  thumbnailSize,
  itemData
}: {
  thumbnailSize: number
  itemData: WearableEntityMetadata | EmoteEntityMetadata
}): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const tokenId = Number(
    itemData.id.split(':').reduce((acc, current) => current, '')
  )
  const rarityColor =
    RARITY_COLORS[itemData?.rarity as RarityName] ?? RARITY_COLORS.base
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSize_S = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  return (
    <UiEntity
      uiTransform={{
        width: thumbnailSize,
        height: thumbnailSize * 1.45,
        borderRadius: fontSize / 2,
        borderColor: COLOR.TEXT_COLOR_WHITE,
        borderWidth: 0,
        margin: canvasScaleRatio * 14,
        flexDirection: 'column'
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_7
      }}
      onMouseDown={() => {
        if (!isNaN(tokenId)) {
          store.dispatch(
            pushPopupAction({
              type: HUD_POPUP_TYPE.MARKETPLACE,
              data: `https://decentraland.org/marketplace/contracts/${itemData.collectionAddress}/items/${tokenId}`
            })
          )
        } else {
          // TODO
        }
      }}
    >
      <UiEntity
        uiTransform={{
          flexGrow: 0,
          flexShrink: 0,
          width: thumbnailSize,
          height: thumbnailSize,
          overflow: 'hidden'
        }}
        uiBackground={getBackgroundFromAtlas({
          spriteName: `rarity-background-${itemData?.rarity ?? 'base'}`,
          atlasName: 'backpack'
        })}
      >
        <UiEntity
          uiTransform={{
            flexGrow: 0,
            flexShrink: 0,
            width: thumbnailSize * 0.95,
            height: thumbnailSize * 0.95,
            overflow: 'hidden',
            positionType: 'absolute'
          }}
          uiBackground={{
            texture: {
              src: itemData.thumbnail
            },
            textureMode: 'stretch'
          }}
        />
      </UiEntity>
      <UiEntity
        uiTransform={{
          alignSelf: 'flex-start',
          overflow: 'hidden',
          maxWidth: '100%',
          margin: { top: canvasScaleRatio * -20 }
        }}
        uiText={{
          value: truncateWithoutBreakingWords(
            itemData?.name ?? itemData.i18n[0].text ?? '',
            13
          ),
          fontSize: fontSize_S,
          textWrap: 'nowrap'
        }}
      />
      <Tag
        uiTransform={{
          margin: {
            left: canvasScaleRatio * 10
          }
        }}
        text={`<b>${itemData?.rarity?.toUpperCase() ?? 'BASE'}</b>`}
        backgroundColor={{ ...rarityColor, a: 0.2 }}
        textColor={rarityColor}
        canvasScaleRatio={canvasScaleRatio * 0.8}
      />
    </UiEntity>
  )
}
