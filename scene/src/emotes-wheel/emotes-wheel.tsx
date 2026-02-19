import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getContentScaleRatio } from '../service/canvas-ratio'
import { getBackgroundFromAtlas } from '../utils/ui-utils'
import { COLOR, RARITY_COLORS } from '../components/color-palette'
import { wheelNumbers, wheelSlotBoxes } from './wheel-boxes'
import { getPlayer } from '@dcl/sdk/src/players'
import { getURNWithoutTokenId } from '../utils/urn-utils'
import {
  type EquippedEmote,
  type offchainEmoteURN,
  type URN,
  type URNWithoutTokenId
} from '../utils/definitions'
import { getEmoteThumbnail } from '../service/emotes'
import { catalystMetadataMap } from '../utils/catalyst-metadata-map'
import { fetchEmotesData } from '../utils/emotes-promise-utils'
import { type EmoteEntityMetadata } from '../utils/item-definitions'
import {
  DEFAULT_EMOTE_NAMES,
  DEFAULT_EMOTES
} from '../utils/backpack-constants'
import { triggerEmote } from '~system/RestrictedActions'
import {
  engine,
  InputAction,
  inputSystem,
  PointerEventType
} from '@dcl/sdk/ecs'
import { BACKPACK_SECTION } from '../state/backpack/state'
import { store } from '../state/store'
import { changeSectionAction } from '../state/backpack/actions'
import { CloseButton } from '../components/close-button'
import { isFalsy } from '../utils/function-utils'
import { listenSystemAction } from '../service/system-actions-emitter'

const state: any = {
  visible: false,
  hoveredURN: '',
  hoveredIndex: null
}
export async function initEmotesWheel({
  showBackpackMenu
}: {
  showBackpackMenu: () => void
}): Promise<void> {
  const equippedEmotes: EquippedEmote[] = (
    getPlayer()?.emotes ?? DEFAULT_EMOTES
  ).map((e) => getURNWithoutTokenId(e as URN) as EquippedEmote)

  const switchIfPressed = (pressed: boolean): void => {
    if (pressed) switchEmotesWheelVisibility()
  }

  await fetchEmotesData(...equippedEmotes)

  listenSystemAction('Emote', switchIfPressed)

  new Array(10).fill(null).forEach((_, index) => {
    listenSystemAction(`QuickEmote${(index + 1) % 10}`, () => {
      if (state.visible) {
        const equippedEmotes: EquippedEmote[] = (getPlayer()?.emotes ?? []).map(
          (e) => getURNWithoutTokenId(e as URN) as EquippedEmote
        )
        triggerEmote({ predefinedEmote: equippedEmotes[index] }).catch(
          console.error
        )
        state.visible = false
      }
    })
  })

  engine.addSystem(() => {
    const cmd = inputSystem.getInputCommand(
      InputAction.IA_ANY,
      PointerEventType.PET_DOWN,
      engine.RootEntity
    )

    if (cmd) {
      if (cmd?.button === InputAction.IA_PRIMARY && state.visible) {
        showBackpackMenu()
        store.dispatch(changeSectionAction(BACKPACK_SECTION.EMOTES))
      }
    }
  })
}

export function switchEmotesWheelVisibility(): void {
  state.visible = !state.visible
}

export function renderEmotesWheel(): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const equippedEmotes: EquippedEmote[] = (getPlayer()?.emotes ?? []).map(
    (e) => getURNWithoutTokenId(e as URN) as EquippedEmote
  )
  const hoveredEmoteData: EmoteEntityMetadata | null = state.hoveredURN
    ? (catalystMetadataMap[
        state.hoveredURN as URNWithoutTokenId
      ] as EmoteEntityMetadata)
    : null
  const hoveredName: string = state.hoveredURN
    ? hoveredEmoteData?.name ??
      DEFAULT_EMOTE_NAMES[state.hoveredURN as offchainEmoteURN] ??
      ''
    : ''

  return (
    state.visible && (
      <UiEntity
        uiTransform={{
          alignItems: 'center',
          alignSelf: 'center',
          justifyContent: 'center',
          positionType: 'absolute',
          width: '100%',
          height: '100%'
        }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            width: canvasScaleRatio * 1000,
            height: canvasScaleRatio * 1000
          }}
          uiBackground={getBackgroundFromAtlas({
            spriteName: 'wheel-background',
            atlasName: 'emotes'
          })}
        >
          {equippedEmotes.map((equippedEmote, index) => {
            const visualSlotInfo = getSlotInfo(index)
            const equippedEmoteData: EmoteEntityMetadata = catalystMetadataMap[
              equippedEmote as URNWithoutTokenId
            ] as EmoteEntityMetadata

            return (
              <UiEntity
                uiTransform={{
                  width: visualSlotInfo.width,
                  height: visualSlotInfo.height,
                  positionType: 'absolute',
                  flexShrink: 0,
                  position: {
                    top: visualSlotInfo.y,
                    left: visualSlotInfo.x
                  },
                  flexGrow: 0
                }}
                uiBackground={{
                  ...getBackgroundFromAtlas({
                    spriteName: visualSlotInfo.spriteName,
                    atlasName: 'emotes'
                  }),
                  color: isFalsy(equippedEmoteData)
                    ? COLOR.WHEEL_BASE_RARITY
                    : getLighterColorIfHovered(
                        index,
                        equippedEmoteData?.rarity === 'base'
                          ? COLOR.WHEEL_BASE_RARITY
                          : RARITY_COLORS[equippedEmoteData?.rarity]
                      )
                }}
                onMouseEnter={() => {
                  state.hoveredURN = equippedEmote
                  state.hoveredIndex = index
                }}
                onMouseLeave={() => {
                  if (
                    !(
                      state.hoveredIndex !== null &&
                      state.hoveredIndex !== index
                    )
                  ) {
                    state.hoveredURN = null
                    state.hoveredIndex = null
                  }
                }}
                onMouseDown={() => {
                  triggerEmote({ predefinedEmote: equippedEmote }).catch(
                    console.error
                  )
                  state.visible = false
                }}
              >
                <UiEntity
                  uiTransform={{
                    width: '55%',
                    height: '55%',
                    flexGrow: 0,
                    flexShrink: 0,
                    positionType: 'absolute',
                    margin: '27.5%',
                    alignSelf: 'center'
                  }}
                  uiBackground={
                    equippedEmote
                      ? getEmoteThumbnail(equippedEmote)
                      : getBackgroundFromAtlas({
                          spriteName: 'empty-icon',
                          atlasName: 'backpack'
                        })
                  }
                ></UiEntity>
              </UiEntity>
            )
          })}
          <EmoteNumbers />
          <CloseButton
            uiTransform={{
              position: {
                top: '5%',
                right: '5%'
              }
            }}
            onClick={() => (state.visible = false)}
          />
        </UiEntity>
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            alignSelf: 'center'
          }}
          uiText={{
            value: `${hoveredName}
<b>EMOTES</b>
Customize <b>[E]</b>
Press <b>[Alt + num]</b> to run emote`,
            color: Color4.White(),
            textAlign: 'middle-center',
            fontSize: canvasScaleRatio * 30,
            textWrap: 'wrap'
          }}
        />
      </UiEntity>
    )
  )
}

function getLighterColorIfHovered(
  index: number,
  color: Color4 = COLOR.PANEL_BACKGROUND_LIGHT
): Color4 {
  if (state.hoveredIndex === index) {
    return Color4.create(
      Math.min(color.r + 0.2, 1),
      Math.min(color.g + 0.2, 1),
      Math.min(color.b + 0.2, 1),
      color.a
    )
  }
  return color
}

function EmoteNumbers(): ReactElement {
  return (
    <UiEntity>
      {new Array(10).fill(null).map((_: null, index: number) => {
        const [left, top] = wheelNumbers[index].map(
          (n) => n * getContentScaleRatio() * 2.1
        )

        return (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: {
                top: top - getContentScaleRatio() * 30,
                left: left - getContentScaleRatio() * 20
              },
              zIndex: 1
            }}
            uiText={{
              value: `<b>${(index + 1).toString().slice(-1, 2)}</b>`,
              color: COLOR.TEXT_COLOR,
              fontSize: getContentScaleRatio() * 35,
              textAlign: 'middle-center'
            }}
          />
        )
      })}
    </UiEntity>
  )
}

function getSlotInfo(index: number): any {
  const canvasScaleRatio = getContentScaleRatio()
  const spriteName: string = `wheel-slot-${index}`

  const slotBox = wheelSlotBoxes[index]
  const [x, y, width, height] = slotBox.map((i) => canvasScaleRatio * i * 2.1)
  return {
    spriteName,
    x,
    y,
    width,
    height
  }
}
