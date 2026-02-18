import type {
  EquippedEmote,
  URNWithoutTokenId
} from '../../../utils/definitions'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { store } from '../../../state/store'
import { ROUNDED_TEXTURE_BACKGROUND } from '../../../utils/constants'
import { COLOR } from '../../../components/color-palette'
import {
  selectEmoteSlotAction,
  updateEquippedEmoteAction
} from '../../../state/backpack/actions'
import { playPreviewEmote } from '../../../components/backpack/AvatarPreview'
import { getBackgroundFromAtlas } from '../../../utils/ui-utils'
import { getEmoteName, getEmoteThumbnail } from '../../../service/emotes'
import { catalystMetadataMap } from '../../../utils/catalyst-metadata-map'
import Icon from '../../../components/icon/Icon'
import type { UiTransformProps } from '@dcl/sdk/react-ecs'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
const state: { hoveredIndex: number | null } = { hoveredIndex: null }
export function EquippedEmoteList({
  equippedEmotes
}: {
  equippedEmotes: EquippedEmote[]
}): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()

  return (
    <UiEntity uiTransform={{ flexDirection: 'column' }}>
      {equippedEmotes.map((equippedEmoteURN: EquippedEmote, index: number) => {
        const isHovered = (): boolean => state.hoveredIndex === index
        const backpackState = store.getState().backpack
        const fontSize = getFontSize({ context: CONTEXT.DIALOG })

        return (
          <UiEntity
            uiTransform={{
              height: canvasScaleRatio * 120,
              width: canvasScaleRatio * 498,
              margin: {
                left: canvasScaleRatio * 10,
                right: canvasScaleRatio * 10,
                bottom: canvasScaleRatio * 5,
                top: canvasScaleRatio * 5
              },
              flexDirection: 'row',
              justifyContent: 'flex-start',
              alignItems: 'center',
              position: { left: '2%' }
            }}
            uiBackground={{
              ...ROUNDED_TEXTURE_BACKGROUND,
              color:
                backpackState.selectedEmoteSlot === index
                  ? COLOR.ACTIVE_BACKGROUND_COLOR
                  : COLOR.DARK_OPACITY_2
            }}
            onMouseDown={() => {
              store.dispatch(selectEmoteSlotAction(index))
              const newBackpackState = store.getState().backpack
              const selectedEmoteURN =
                newBackpackState.equippedEmotes[
                  newBackpackState.selectedEmoteSlot
                ]

              playPreviewEmote(selectedEmoteURN)
            }}
            onMouseEnter={() => {
              state.hoveredIndex = index
            }}
            onMouseLeave={() => {
              if (
                !(state.hoveredIndex !== null && state.hoveredIndex !== index)
              ) {
                state.hoveredIndex = null
              }
            }}
          >
            <UiEntity
              uiTransform={{
                height: canvasScaleRatio * 100,
                width: canvasScaleRatio * 100,
                flexShrink: 0,
                flexGrow: 0,
                margin: { left: '2%' }
              }}
              uiBackground={getBackgroundFromAtlas({
                atlasName: 'backpack',
                spriteName: `emote-circle-${fromIndexToSlot(index)}`
              })}
            />
            <UiEntity
              uiTransform={{
                flexWrap: 'wrap',
                width: '50%'
              }}
              uiText={{
                textAlign: 'top-left',
                value: getEmoteName(equippedEmoteURN),
                fontSize
              }}
            />
            {isHovered() && index !== backpackState.selectedEmoteSlot && (
              <EmoteHoveredSquare />
            )}
            <UiEntity
              uiTransform={{
                height: canvasScaleRatio * (equippedEmoteURN ? 105 : 100),
                width: canvasScaleRatio * 100,
                flexShrink: 0,
                positionType: 'absolute',
                position: {
                  right: canvasScaleRatio * 20,
                  top: canvasScaleRatio * 10
                }
              }}
              uiBackground={
                equippedEmoteURN
                  ? getBackgroundFromAtlas({
                      atlasName: 'backpack',
                      spriteName: `rarity-background-${
                        catalystMetadataMap[
                          equippedEmoteURN as URNWithoutTokenId
                        ]?.rarity ?? 'base'
                      }`
                    })
                  : getBackgroundFromAtlas({
                      atlasName: 'backpack',
                      spriteName: 'empty-wearable-field'
                    })
              }
            >
              {isHovered() && backpackState.equippedEmotes[index] && (
                <UnequipEmoteCross slot={index} index={index} />
              )}
              <UiEntity
                uiTransform={{
                  height: canvasScaleRatio * 100,
                  width: canvasScaleRatio * 100,
                  flexShrink: 0
                }}
                uiBackground={{
                  ...getEmoteThumbnail(equippedEmoteURN)
                  // color: Color4.create(1, 0, 0, 0.4)
                }}
              />
            </UiEntity>
          </UiEntity>
        )
      })}
    </UiEntity>
  )
}
function fromIndexToSlot(index: number): number {
  return (index + 1) % 10
}

function UnequipEmoteCross({
  slot,
  index
}: {
  slot: number
  index: number
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
        pointerFilter: 'none',
        zIndex: 1
      }}
      uiBackground={{
        ...ROUNDED_TEXTURE_BACKGROUND,
        color: COLOR.TEXT_COLOR
      }}
      onMouseDown={() => {
        store.dispatch(updateEquippedEmoteAction({ slot, equippedEmote: '' }))
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

function EmoteHoveredSquare(): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const transform: UiTransformProps = {
    width: 108 * canvasScaleRatio,
    height: 108 * canvasScaleRatio,
    positionType: 'absolute',
    position: {
      right: 16 * canvasScaleRatio,
      top: 6 * canvasScaleRatio
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
