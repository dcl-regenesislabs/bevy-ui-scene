import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { getBackgroundFromAtlas } from '../../../utils/ui-utils'
import { store } from '../../../state/store'
import {
  type OutfitDefinition,
  type OutfitsMetadata
} from '../../../utils/outfit-definitions'
import { Color4 } from '@dcl/sdk/math'
import {
  getOutfitsCameraEntity,
  updateOutfitAvatar
} from '../../../components/backpack/OutfitAvatar'
import { RoundedButton } from '../../../components/rounded-button'
import {
  resetOutfitAction,
  updateAvatarBase,
  updateEquippedWearables,
  updateForceRenderAction,
  updateLoadedOutfitsMetadataAction
} from '../../../state/backpack/actions'
import { type URNWithoutTokenId } from '../../../utils/definitions'
import {
  getItemsWithTokenId,
  getURNWithoutTokenId
} from '../../../utils/urn-utils'
import { catalystMetadataMap } from '../../../utils/catalyst-metadata-map'
import { fetchWearablesData } from '../../../utils/wearables-promise-utils'
import { getRealm } from '~system/Runtime'
import { updateAvatarPreview } from '../../../components/backpack/AvatarPreview'
import { cloneDeep } from '../../../utils/function-utils'
import type { RGBColor } from '../../../bevy-api/interface'
import { ButtonIcon } from '../../../components/button-icon'
import { openExternalUrl } from '~system/RestrictedActions'
import { getOutfitLocalKey } from '../../../utils/outfits-promise-utils'
import { DOUBLE_CLICK_DELAY } from '../../../utils/constants'
import { showDeleteOutfitConfirmation } from './delete-outfit-dialog'
import { NavButton } from '../../../components/nav-button/NavButton'
import { COLOR } from '../../../components/color-palette'
import { getPlayer } from '@dcl/sdk/src/players'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'

declare const localStorage: any

const SLOTS: any[] = new Array(10).fill(null)
const FREE_SLOTS_WITHOUT_NAMES = 5
const state: {
  hoveredIndex: number
  selectedIndex: number
  lastTimeClick: number
  lastElementClick: number | null
} = {
  hoveredIndex: -1,
  selectedIndex: -1,
  lastTimeClick: 0,
  lastElementClick: null
}

export const OutfitsCatalog = (): ReactElement => {
  const canvasScaleRatio = getContentScaleRatio()
  const backpackState = store.getState().backpack
  const outfitsMetadata = backpackState.outfitsMetadata
  const viewSlots: Array<OutfitDefinition | null> = [...SLOTS]
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  outfitsMetadata?.outfits.forEach((outfitMetadata) => {
    viewSlots[outfitMetadata.slot] = outfitMetadata.outfit
  })
  return (
    <UiEntity
      uiTransform={{
        width: getContentScaleRatio() * 2145,
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        padding: { bottom: '4%' }
      }}
    >
      {viewSlots.map((viewSlot, index: number) => {
        return (
          <UiEntity
            key={index}
            uiTransform={{
              width: canvasScaleRatio * 320,
              height: canvasScaleRatio * 560,
              flexShrink: 0,
              margin: { left: '2%', bottom: '4%', right: '2%' },
              borderRadius: fontSize / 2
            }}
          >
            {state.selectedIndex === index && [
              <ButtonIcon
                icon={{ atlasName: 'backpack', spriteName: 'delete-icon' }}
                iconSize={getContentScaleRatio() * 32}
                uiTransform={{
                  zIndex: 1,
                  positionType: 'absolute',
                  padding: '3%',
                  position: { right: '2%', top: '2%' }
                }}
                uiBackground={{ color: Color4.Black() }}
                onMouseDown={() => {
                  showDeleteOutfitConfirmation(() => {
                    deleteOutfitSlot(index)
                  })
                }}
              />,
              <UiEntity
                uiTransform={{
                  width: canvasScaleRatio * 360,
                  height: canvasScaleRatio * 655,
                  positionType: 'absolute',
                  position: { left: '-4%', top: '-3%' }
                }}
                uiBackground={getBackgroundFromAtlas({
                  atlasName: 'backpack',
                  spriteName: 'outfit-slot-highlight'
                })}
              >
                <RoundedButton
                  uiTransform={{
                    margin: { left: '5%', bottom: '3%' },
                    width: '90%',
                    height: 60 * canvasScaleRatio,
                    alignSelf: 'flex-end'
                  }}
                  fontSize={fontSize}
                  text={'EQUIP'}
                  isSecondary={false}
                  onClick={() => {
                    equipOutfit(viewSlot).catch(console.error)
                  }}
                />
              </UiEntity>
            ]}
            <UiEntity
              uiTransform={{
                width: canvasScaleRatio * 320,
                height: canvasScaleRatio * 560,
                flexShrink: 0,
                margin: { left: '2%', bottom: '4%', right: '2%' },
                borderRadius: fontSize / 2,
                pointerFilter: 'block'
              }}
              uiBackground={{
                ...getBackgroundFromAtlas({
                  atlasName: 'backpack',
                  spriteName:
                    isEmptySlot(viewSlot) &&
                    !isAvailableSlot(index) &&
                    !isFirstAvailableSlot(index)
                      ? 'outfit-dashed-background'
                      : 'outfit-slot-background'
                })
              }}
              onMouseEnter={() => {
                state.hoveredIndex = index
              }}
              onMouseLeave={() => {
                if (
                  !(state.hoveredIndex >= 0 && state.hoveredIndex !== index)
                ) {
                  state.hoveredIndex = -1
                }
              }}
            >
              {isEmptySlot(viewSlot) && isAvailableSlot(index) && (
                <EmptySlot slotIndex={index} />
              )}

              {!isEmptySlot(viewSlot) &&
                FilledOutfitSlot({
                  viewSlot: viewSlot as OutfitDefinition,
                  slotIndex: index
                })}
              {isEmptySlot(viewSlot) && isFirstAvailableSlot(index) && (
                <BuyNameSlot />
              )}
            </UiEntity>
          </UiEntity>
        )
      })}
      {backpackState.changedFromResetVersion && (
        <NavButton
          icon={{ atlasName: 'icons', spriteName: 'BackStepIcon' }}
          text={'RESET OUTFIT'}
          color={Color4.White()}
          backgroundColor={COLOR.SMALL_TAG_BACKGROUND}
          uiTransform={{
            positionType: 'absolute',
            position: { bottom: '1%', left: '2%' }
          }}
          onClick={() => {
            store.dispatch(resetOutfitAction())

            updateAvatarPreview(
              store.getState().backpack.equippedWearables,
              store.getState().backpack.outfitSetup.base,
              store.getState().backpack.forceRender
            )
          }}
        />
      )}
    </UiEntity>
  )

  function FilledOutfitSlot({
    viewSlot,
    slotIndex
  }: {
    viewSlot: OutfitDefinition
    slotIndex: number
  }): ReactElement {
    return (
      <UiEntity
        uiTransform={{
          positionType: 'absolute',
          width: '100%',
          height: '100%',
          alignSelf: 'center',
          position: { left: '0%' },
          zIndex: 9,
          pointerFilter: 'none'
        }}
        onMouseDown={() => {
          if (
            state.lastTimeClick + DOUBLE_CLICK_DELAY > Date.now() &&
            state.lastElementClick === slotIndex
          ) {
            equipOutfit(viewSlot).catch(console.error)
          } else {
            state.lastTimeClick = Date.now()
            state.lastElementClick = slotIndex
            state.selectedIndex = slotIndex
          }
        }}
        uiBackground={{
          textureMode: 'stretch',
          /* texture: {
        src: 'assets/images/mock_outfits_for_uvs_2.png'
      }, */
          videoTexture: {
            videoPlayerEntity: getOutfitsCameraEntity()
          },
          uvs: getUvsFromSprite({
            spriteDefinition: {
              spriteSheetWidth: 4,
              spriteSheetHeight: 3,
              x: (slotIndex % 4) + 0.2,
              y: Math.floor(slotIndex / 4),
              w: 145 / 250,
              h: 1
            }
          })
        }}
      />
    )
  }
  async function equipOutfit(viewSlot: OutfitDefinition | null): Promise<void> {
    store.dispatch(
      updateAvatarBase({
        ...store.getState().backpack.outfitSetup.base,
        skinColor: viewSlot?.skin.color ?? undefined,
        hairColor: viewSlot?.hair.color ?? undefined,
        eyesColor: viewSlot?.eyes.color ?? undefined,
        bodyShapeUrn: viewSlot?.bodyShape as URNWithoutTokenId,
        name: (viewSlot?.name as string) ?? getPlayer()?.name
      })
    )

    const wearables = viewSlot?.wearables.map((i) =>
      getURNWithoutTokenId(i)
    ) as URNWithoutTokenId[]
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
    store.dispatch(updateForceRenderAction(viewSlot?.forceRender ?? []))

    updateAvatarPreview(
      store.getState().backpack.equippedWearables,
      store.getState().backpack.outfitSetup.base,
      store.getState().backpack.forceRender
    )
  }
  function availableSlots(): number {
    return (
      FREE_SLOTS_WITHOUT_NAMES +
      (outfitsMetadata?.namesForExtraSlots.length ?? 0)
    )
  }

  function isFirstAvailableSlot(index: number): boolean {
    return index === availableSlots()
  }

  function isAvailableSlot(index: number): boolean {
    if (!outfitsMetadata) return false

    return index + 1 <= availableSlots()
  }
}

function isEmptySlot(viewSlot: OutfitDefinition | null): boolean {
  if (viewSlot === null) return true
  return !viewSlot?.bodyShape
}

function deleteOutfitSlot(index: number): void {
  const backpackState = store.getState().backpack
  const currentOutfitsMetadata: OutfitsMetadata =
    backpackState.outfitsMetadata as OutfitsMetadata
  const newOutfitsMetadata: OutfitsMetadata = cloneDeep(currentOutfitsMetadata)

  newOutfitsMetadata.outfits = newOutfitsMetadata.outfits.filter(
    (o) => o.slot !== index
  )
  store.dispatch(updateLoadedOutfitsMetadataAction(newOutfitsMetadata))
  state.selectedIndex = -1
  localStorage.setItem(getOutfitLocalKey(), JSON.stringify(newOutfitsMetadata))
}

async function saveOutfitSlot(index: number): Promise<void> {
  const backpackState = store.getState().backpack
  const currentOutfitsMetadata: OutfitsMetadata =
    backpackState.outfitsMetadata as OutfitsMetadata
  const newOutfitsMetadata: OutfitsMetadata = cloneDeep(currentOutfitsMetadata)
  const outfitDefinition: OutfitDefinition = {
    bodyShape: backpackState.outfitSetup.base.bodyShapeUrn,
    eyes: { color: backpackState.outfitSetup.base.eyesColor as RGBColor },
    hair: { color: backpackState.outfitSetup.base.hairColor as RGBColor },
    skin: { color: backpackState.outfitSetup.base.skinColor as RGBColor },
    wearables: getItemsWithTokenId(backpackState.equippedWearables),
    forceRender: backpackState.forceRender,
    name: backpackState.outfitSetup.base.name
  }
  newOutfitsMetadata.outfits.push({
    slot: index,
    outfit: outfitDefinition
  })
  newOutfitsMetadata.outfits.sort((a, b) => a.slot - b.slot)
  store.dispatch(updateLoadedOutfitsMetadataAction(newOutfitsMetadata))

  updateOutfitAvatar(index, outfitDefinition)

  localStorage.setItem(getOutfitLocalKey(), JSON.stringify(newOutfitsMetadata))
}

function EmptySlot({ slotIndex }: { slotIndex: number }): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        width: '80%',
        height: '80%',
        alignSelf: 'center',
        position: { left: '10%' },
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{
        ...getBackgroundFromAtlas({
          atlasName: 'backpack',
          spriteName: 'outfit-slot-silhouette'
        }),
        color: Color4.create(0, 0, 0, 1)
      }}
      uiText={{
        value:
          state.hoveredIndex === slotIndex
            ? `\n\nSAVE OUTFIT`
            : `<b>Empty</b>\nSLOT`,
        fontSize
      }}
      onMouseDown={() => {
        saveOutfitSlot(slotIndex).catch(console.error)
      }}
    >
      {state.hoveredIndex === slotIndex && (
        <UiEntity
          uiTransform={{
            width: canvasScaleRatio * 88,
            height: canvasScaleRatio * 88,
            positionType: 'absolute',
            alignSelf: 'center',

            position: { top: '30%' }
          }}
          uiBackground={getBackgroundFromAtlas({
            atlasName: 'backpack',
            spriteName: 'add-icon'
          })}
          uiText={{ value: '' }}
        ></UiEntity>
      )}
    </UiEntity>
  )
}

function BuyNameSlot(): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        width: '80%',
        alignSelf: 'center',
        position: { left: '10%' },
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        alignContent: 'center'
      }}
      uiText={{
        value: `Buy a <b>name</b> to add\nand extra slot!\n\n`,
        fontSize: canvasScaleRatio * 29
      }}
    >
      <RoundedButton
        uiTransform={{ width: '100%', alignSelf: 'center' }}
        text={`BUY NAME`}
        fontSize={fontSize}
        onClick={() => {
          openExternalUrl({
            url: `https://decentraland.org/marketplace/names/claim`
          }).catch(console.error)
        }}
      />
    </UiEntity>
  )
}

// TODO import from sammich-system project
export function getUvsFromSprite({
  spriteDefinition,
  back = 0
}: any): number[] {
  const { spriteSheetWidth, spriteSheetHeight, x, y, w, h } = spriteDefinition
  const X1 = x / spriteSheetWidth
  const X2 = x / spriteSheetWidth + w / spriteSheetWidth
  const Y1 = 1 - y / spriteSheetHeight
  const Y2 = 1 - (y / spriteSheetHeight + h / spriteSheetHeight)
  const FRONT_UVS = [
    X1,
    Y2, // A
    X1,
    Y1, // B
    X2,
    Y1, // C
    X2,
    Y2 // D
  ]
  const BACK_UVS =
    back === 0
      ? [0, 0, 0, 0, 0, 0, 0, 0]
      : back === 1
      ? FRONT_UVS
      : [X2, Y2, X2, Y1, X1, Y1, X1, Y2]

  return [...FRONT_UVS, ...BACK_UVS]
}
