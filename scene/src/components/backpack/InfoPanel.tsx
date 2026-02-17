import { getBackgroundFromAtlas } from '../../utils/ui-utils'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import type {
  EmoteEntityMetadata,
  RarityName,
  WearableEntityMetadata
} from '../../utils/item-definitions'
import Icon from '../icon/Icon'
import { Label, type UiTransformProps } from '@dcl/sdk/react-ecs'

import { COLOR, RARITY_COLORS } from '../color-palette'
import { ROUNDED_TEXTURE_BACKGROUND } from '../../utils/constants'
import {
  WEARABLE_CATEGORY_DEFINITIONS,
  type WearableCategory
} from '../../service/categories'
import { BACKPACK_SECTION } from '../../state/backpack/state'
import { store } from '../../state/store'
import { getEmoteThumbnail } from '../../service/emotes'
import { Tag } from '../color-tag'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'

export type InfoPanelProps = {
  canvasScaleRatio: number
  entityMetadata: WearableEntityMetadata | EmoteEntityMetadata | null
  uiTransform?: UiTransformProps
}

export function InfoPanel({
  canvasScaleRatio,
  entityMetadata,
  uiTransform
}: InfoPanelProps): ReactElement {
  const rarityColor = RARITY_COLORS[entityMetadata?.rarity as RarityName]
  const data =
    (entityMetadata as WearableEntityMetadata)?.data ??
    (entityMetadata as EmoteEntityMetadata)?.emoteDataADR74
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const tagFontSize = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TAG
  })
  return (
    <UiEntity
      uiTransform={{
        margin: { left: 20 * canvasScaleRatio },
        width: 600 * canvasScaleRatio,
        height: 1400 * canvasScaleRatio,
        flexDirection: 'column',
        ...uiTransform
      }}
      uiBackground={{
        ...getBackgroundFromAtlas({
          atlasName: 'info-panel',
          spriteName: entityMetadata ? entityMetadata.rarity ?? 'base' : 'empty'
        })
      }}
    >
      {entityMetadata ? (
        <UiEntity
          uiTransform={{
            width: '100%',
            padding: { left: '5%' },
            alignSelf: 'center',
            flexDirection: 'column'
          }}
        >
          <UiEntity
            uiTransform={{
              width: canvasScaleRatio * 400,
              height: canvasScaleRatio * 400,
              alignSelf: 'center',
              margin: { top: '10%' }
            }}
            uiBackground={getEmoteThumbnail(entityMetadata?.id)}
          />
          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              margin: { top: 80 * canvasScaleRatio },
              maxWidth: canvasScaleRatio * 500,
              alignItems: 'flex-start',
              alignContent: 'flex-start',
              justifyContent: 'flex-start'
            }}
          >
            <Icon
              uiTransform={{
                alignSelf: 'flex-start',
                justifyContent: 'flex-start',
                flexShrink: 0,
                margin: { top: 20 * canvasScaleRatio },
                width: canvasScaleRatio * 40,
                height: canvasScaleRatio * 40
              }}
              icon={{
                spriteName: `category-${
                  store.getState().backpack.activeSection ===
                  BACKPACK_SECTION.EMOTES
                    ? 'dance'
                    : data.category
                }`,
                atlasName: 'backpack'
              }}
              iconSize={fontSize}
            />
            <UiEntity
              uiTransform={{
                alignSelf: 'flex-start'
              }}
              uiText={{
                value: `<b>${entityMetadata?.name}</b>`,
                fontSize,
                textWrap: 'wrap',
                textAlign: 'top-left'
              }}
            />
          </UiEntity>
          <Tag
            text={entityMetadata?.rarity?.toUpperCase() ?? ''}
            backgroundColor={rarityColor}
            canvasScaleRatio={canvasScaleRatio}
          />
          {entityMetadata?.description !== '' && (
            <UiEntity
              uiTransform={{
                flexDirection: 'column',
                position: { left: '-2%' }
              }}
            >
              <Label
                value={`<b>DESCRIPTION</b>`}
                fontSize={fontSize}
                uiTransform={{
                  alignSelf: 'flex-start',
                  margin: { top: 10 * canvasScaleRatio }
                }}
              />

              <UiEntity
                uiTransform={{ width: '100%' }}
                uiText={{
                  value: `${entityMetadata?.description}`,
                  textAlign: 'top-left',
                  fontSize
                }}
              />
            </UiEntity>
          )}
          {data.hides?.length > 0 && (
            <UiEntity
              uiTransform={{
                flexDirection: 'column',
                margin: { top: 30 * canvasScaleRatio }
              }}
            >
              <UiEntity
                uiTransform={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start'
                }}
              >
                <Icon
                  uiTransform={{
                    flexShrink: 0,
                    position: { top: fontSize * 0.2 }
                  }}
                  iconSize={fontSize}
                  icon={{ atlasName: 'backpack', spriteName: 'icon-hidden' }}
                />
                <Label
                  value={`<b>HIDES</b>`}
                  fontSize={fontSize}
                  uiTransform={{
                    margin: { top: 10 * canvasScaleRatio }
                  }}
                />
              </UiEntity>
              <UiEntity
                uiTransform={{
                  flexWrap: 'wrap',
                  width: '100%',
                  flexDirection: 'row',
                  margin: { top: '5%' }
                }}
              >
                {data.hides?.map((hiddenCategory: string) => {
                  return (
                    <UiEntity
                      uiBackground={{
                        ...ROUNDED_TEXTURE_BACKGROUND,
                        color: COLOR.SMALL_TAG_BACKGROUND
                      }}
                      uiTransform={{
                        flexDirection: 'row',
                        padding: {
                          top: '1%',
                          left: fontSize / 4,
                          right: fontSize / 4
                        },
                        flexShrink: 0,
                        flexGrow: 0,
                        alignContent: 'center',
                        justifyContent: 'center',
                        margin: {
                          left: 12 * canvasScaleRatio,
                          top: 12 * canvasScaleRatio
                        }
                      }}
                    >
                      {/* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */}
                      {WEARABLE_CATEGORY_DEFINITIONS[
                        hiddenCategory as WearableCategory
                      ] && (
                        <Icon
                          iconSize={fontSize}
                          uiTransform={{
                            alignSelf: 'center',
                            position: { top: '-4%' },
                            flexShrink: 0,
                            flexGrow: 0
                          }}
                          icon={{
                            atlasName: 'backpack',
                            spriteName: `category-${hiddenCategory}`
                          }}
                        />
                      )}
                      <Label
                        value={`<b>${
                          WEARABLE_CATEGORY_DEFINITIONS[
                            hiddenCategory as WearableCategory
                          ]?.label.toUpperCase() ?? hiddenCategory.toUpperCase()
                        }</b>`}
                        textWrap={'nowrap'}
                        fontSize={tagFontSize}
                      />
                    </UiEntity>
                  )
                })}
              </UiEntity>
            </UiEntity>
          )}
        </UiEntity>
      ) : (
        <UiEntity
          uiTransform={{
            margin: { top: '100%' }
          }}
          uiText={{
            value: 'No item selected',
            fontSize
          }}
        />
      )}
    </UiEntity>
  )
}
