import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { CloseButton } from '../../../components/close-button'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import type { Atlas } from '../../../utils/definitions'
import { BORDER_RADIUS_F, parseCoordinates } from '../../../utils/ui-utils'
import { noop } from '../../../utils/function-utils'
import { store } from '../../../state/store'
import { closeLastPopupAction } from '../../../state/hud/actions'
import Icon from '../../../components/icon/Icon'
import type { PlaceFromApi } from '../../scene-info-card/SceneInfoCard.types'
import {
  updateFavoriteStatus,
  updateLikeStatus
} from '../../../utils/promise-utils'
import { updateCachedCommunityPlace } from '../../../utils/communities-promise-utils'
import { MAIN_REALM_URL } from '../../../utils/constants'
import { BevyApi } from '../../../bevy-api'
import { executeTask } from '@dcl/sdk/ecs'
import {
  changeRealm,
  copyToClipboard,
  openExternalUrl,
  teleportTo
} from '~system/RestrictedActions'
import { currentRealmProviderIsWorld } from '../../../service/realm-change'
import { showErrorPopup } from '../../../service/error-popup-service'
import { Vector2 } from '@dcl/sdk/math'
import useState = ReactEcs.useState

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${day}/${month}/${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

export const CommunityPlacePopup: Popup = ({ shownPopup }) => {
  const place = shownPopup.data as PlaceFromApi
  if (place == null) return null
  return <CommunityPlacePopupContent place={place} />
}

function CommunityPlacePopupContent({
  place
}: {
  place: PlaceFromApi
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const fontSizeCaption = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const scale = getContentScaleRatio()
  const thumbnailSize = scale * 260

  const [isFav, setIsFav] = useState<boolean>(place.user_favorite ?? false)
  const [isLiked, setIsLiked] = useState<boolean>(place.user_like ?? false)
  const [isDisliked, setIsDisliked] = useState<boolean>(
    place.user_dislike ?? false
  )
  const [likesCount, setLikesCount] = useState<number>(place.likes)
  const [favoritesCount, setFavoritesCount] = useState<number>(place.favorites)
  const [updatingFav, setUpdatingFav] = useState<boolean>(false)
  const [updatingLike, setUpdatingLike] = useState<boolean>(false)
  const [shareOpen, setShareOpen] = useState<boolean>(false)

  const likeRate =
    likesCount + place.dislikes > 0
      ? Math.round((likesCount / (likesCount + place.dislikes)) * 100)
      : 0

  const toggleFav = (): void => {
    if (updatingFav) return
    const next = !isFav
    setIsFav(next)
    setFavoritesCount(favoritesCount + (next ? 1 : -1))
    setUpdatingFav(true)
    executeTask(async () => {
      try {
        await updateFavoriteStatus(place.id, next)
        updateCachedCommunityPlace(place.id, {
          user_favorite: next,
          favorites: favoritesCount + (next ? 1 : -1)
        })
      } catch (error) {
        setIsFav(!next)
        setFavoritesCount(favoritesCount)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'updateFavoriteStatus'
        )
      } finally {
        setUpdatingFav(false)
      }
    })
  }

  const setLike = (target: 'like' | 'dislike'): void => {
    if (updatingLike) return
    const prev = {
      isLiked,
      isDisliked,
      likesCount
    }
    let nextIsLiked = isLiked
    let nextIsDisliked = isDisliked
    let nextLikes = likesCount
    let apiArg: boolean | null
    if (target === 'like') {
      nextIsLiked = !isLiked
      nextIsDisliked = false
      nextLikes = likesCount + (nextIsLiked ? 1 : -1)
      apiArg = nextIsLiked ? true : null
    } else {
      nextIsDisliked = !isDisliked
      nextIsLiked = false
      if (isLiked) nextLikes = Math.max(0, likesCount - 1)
      apiArg = nextIsDisliked ? false : null
    }
    setIsLiked(nextIsLiked)
    setIsDisliked(nextIsDisliked)
    setLikesCount(nextLikes)
    setUpdatingLike(true)
    executeTask(async () => {
      try {
        await updateLikeStatus(place.id, apiArg)
        updateCachedCommunityPlace(place.id, {
          user_like: nextIsLiked,
          user_dislike: nextIsDisliked,
          likes: nextLikes
        })
      } catch (error) {
        setIsLiked(prev.isLiked)
        setIsDisliked(prev.isDisliked)
        setLikesCount(prev.likesCount)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'updateLikeStatus'
        )
      } finally {
        setUpdatingLike(false)
      }
    })
  }

  const setHome = (): void => {
    const coord = parseCoordinates(place.base_position)
    if (coord == null) return
    const parcel = Vector2.create(coord.x, coord.y)
    BevyApi.setHomeScene({
      realm: MAIN_REALM_URL,
      parcel
    })
  }

  const jumpIn = (): void => {
    const coord = parseCoordinates(place.base_position)
    if (coord == null) return
    executeTask(async () => {
      try {
        if (place.world && place.world_name != null) {
          await changeRealm({ realm: place.world_name })
        } else if (currentRealmProviderIsWorld()) {
          await changeRealm({
            realm: MAIN_REALM_URL
          })
        }
        await teleportTo({
          worldCoordinates: { x: coord.x, y: coord.y }
        })
        store.dispatch(closeLastPopupAction())
      } catch (error) {
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'jumpIn'
        )
      }
    })
  }

  const shareUrl = `https://decentraland.org/jump/?position=${place.base_position}`
  const shareText = `Check out ${place.title}, a cool place I found in Decentraland!`

  const onShareX = (): void => {
    setShareOpen(false)
    void openExternalUrl({
      url: `https://x.com/intent/post?text=${encodeURIComponent(
        shareText
      )}&hashtags=DCLPlace&url=${encodeURIComponent(shareUrl)}`
    })
  }

  const onCopyLink = (): void => {
    setShareOpen(false)
    copyToClipboard({ text: `${shareText} ${shareUrl} #DCLPlace` }).catch(
      console.error
    )
  }

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          width: getContentScaleRatio() * 1400,
          borderRadius: BORDER_RADIUS_F,
          padding: fontSize * 1.5
        }}
        uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
        onMouseDown={noop}
      >
        <CloseButton
          uiTransform={{
            position: { top: fontSize, right: fontSize },
            positionType: 'absolute'
          }}
          onClick={() => {
            store.dispatch(closeLastPopupAction())
          }}
        />

        {/* Header: thumbnail + info + actions */}
        <Row
          uiTransform={{
            width: '100%',
            alignItems: 'flex-start',
            margin: { bottom: fontSize }
          }}
        >
          {/* Thumbnail */}
          <UiEntity
            uiTransform={{
              width: thumbnailSize,
              height: thumbnailSize,
              borderRadius: fontSize,
              flexShrink: 0,
              margin: { right: fontSize }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: place.image }
            }}
          />

          {/* Info column */}
          <Column
            uiTransform={{
              flexGrow: 1,
              alignItems: 'flex-start'
            }}
          >
            <UiEntity
              uiText={{
                value: `<b>${place.title}</b>`,
                fontSize: fontSizeTitle,
                color: COLOR.TEXT_COLOR_WHITE,
                textAlign: 'top-left'
              }}
            />
            {place.contact_name != null && place.contact_name.length > 0 && (
              <UiEntity
                uiTransform={{ margin: { top: fontSize * 0.2 } }}
                uiText={{
                  value: `created by ${place.contact_name}`,
                  fontSize: fontSizeCaption,
                  color: COLOR.TEXT_COLOR_LIGHT_GREY,
                  textAlign: 'top-left'
                }}
              />
            )}

            {/* Stats: views + like rate */}
            <Row
              uiTransform={{
                alignItems: 'center',
                margin: { top: fontSize * 0.5, bottom: fontSize * 0.5 }
              }}
            >
              <Icon
                icon={{ spriteName: 'ViewIcn', atlasName: 'icons' }}
                iconSize={fontSizeCaption}
                iconColor={COLOR.TEXT_COLOR_LIGHT_GREY}
              />
              <UiEntity
                uiTransform={{ margin: { right: fontSize * 0.8 } }}
                uiText={{
                  value: ` ${place.user_visits ?? 0}`,
                  fontSize: fontSizeCaption,
                  color: COLOR.TEXT_COLOR_LIGHT_GREY
                }}
              />
              <Icon
                icon={{ spriteName: 'Like', atlasName: 'icons' }}
                iconSize={fontSizeCaption}
                iconColor={COLOR.TEXT_COLOR_LIGHT_GREY}
              />
              <UiEntity
                uiText={{
                  value: ` ${likeRate}%`,
                  fontSize: fontSizeCaption,
                  color: COLOR.TEXT_COLOR_LIGHT_GREY
                }}
              />
            </Row>

            {/* Icon action row */}
            <Row
              uiTransform={{
                alignItems: 'center',
                margin: { bottom: fontSize * 0.5 }
              }}
            >
              <ActionIconButton
                fontSize={fontSize}
                spriteName={isLiked ? 'Like solid' : 'Like'}
                active={isLiked}
                pulsing={updatingLike}
                onClick={() => {
                  setLike('like')
                }}
              />
              <ActionIconButton
                fontSize={fontSize}
                spriteName={isDisliked ? 'Dislike solid' : 'Dislike'}
                active={isDisliked}
                pulsing={updatingLike}
                onClick={() => {
                  setLike('dislike')
                }}
              />
              <ActionIconButton
                fontSize={fontSize}
                spriteName={isFav ? 'HeartOnOutlined' : 'HeartOffOutlined'}
                atlasName="toggles"
                active={isFav}
                pulsing={updatingFav}
                onClick={toggleFav}
              />
              <ActionIconButton
                fontSize={fontSize}
                spriteName="House"
                atlasName="icons"
                active={false}
                pulsing={false}
                onClick={setHome}
              />
              <UiEntity uiTransform={{ flexDirection: 'column' }}>
                <ActionIconButton
                  fontSize={fontSize}
                  spriteName="Share"
                  atlasName="context"
                  active={shareOpen}
                  pulsing={false}
                  onClick={() => {
                    setShareOpen(!shareOpen)
                  }}
                />
                {shareOpen && (
                  <ShareMenu
                    fontSize={fontSize}
                    fontSizeSmall={fontSizeSmall}
                    onShareX={onShareX}
                    onCopyLink={onCopyLink}
                  />
                )}
              </UiEntity>
            </Row>

            {/* JUMP IN (single CTA — "Start Navigation" removed per request) */}
            <UiEntity
              uiTransform={{
                borderRadius: fontSize / 2,
                height: fontSize * 2.5,
                padding: { left: fontSize, right: fontSize },
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row'
              }}
              uiBackground={{ color: COLOR.BUTTON_PRIMARY }}
              onMouseDown={jumpIn}
            >
              <Icon
                icon={{ spriteName: 'JumpIn', atlasName: 'icons' }}
                iconSize={fontSizeSmall}
                iconColor={COLOR.WHITE}
              />
              <UiEntity
                uiText={{
                  value: '<b>JUMP IN</b>',
                  fontSize: fontSizeSmall,
                  color: COLOR.WHITE,
                  textWrap: 'nowrap'
                }}
              />
            </UiEntity>
          </Column>
        </Row>

        {/* Description */}
        <Column
          uiTransform={{
            width: '100%',
            margin: { top: fontSize, bottom: fontSize }
          }}
        >
          <UiEntity
            uiText={{
              value: '<b>DESCRIPTION</b>',
              fontSize: fontSizeSmall,
              color: COLOR.TEXT_COLOR_LIGHT_GREY,
              textAlign: 'top-left'
            }}
            uiTransform={{ width: '100%' }}
          />
          <UiEntity
            uiText={{
              value: place.description ?? '',
              fontSize: fontSizeCaption,
              color: COLOR.TEXT_COLOR_WHITE,
              textAlign: 'top-left',
              textWrap: 'wrap'
            }}
            uiTransform={{ width: '100%' }}
          />
        </Column>

        {/* Location + Parcels */}
        <Row
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize }
          }}
        >
          <Column uiTransform={{ width: '50%' }}>
            <UiEntity
              uiText={{
                value: '<b>LOCATION</b>',
                fontSize: fontSizeSmall,
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                textAlign: 'top-left'
              }}
              uiTransform={{ width: '100%' }}
            />
            <Row uiTransform={{ alignItems: 'center' }}>
              <Icon
                icon={{ spriteName: 'PinIcn', atlasName: 'icons' }}
                iconSize={fontSizeCaption}
                iconColor={COLOR.TEXT_COLOR_WHITE}
              />
              <UiEntity
                uiText={{
                  value: ` ${place.base_position}`,
                  fontSize: fontSizeCaption,
                  color: COLOR.TEXT_COLOR_WHITE
                }}
              />
            </Row>
          </Column>
          <Column uiTransform={{ width: '50%' }}>
            <UiEntity
              uiText={{
                value: '<b>PARCELS</b>',
                fontSize: fontSizeSmall,
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                textAlign: 'top-left'
              }}
              uiTransform={{ width: '100%' }}
            />
            <UiEntity
              uiText={{
                value: `${place.positions.length}`,
                fontSize: fontSizeCaption,
                color: COLOR.TEXT_COLOR_WHITE,
                textAlign: 'top-left'
              }}
              uiTransform={{ width: '100%' }}
            />
          </Column>
        </Row>

        {/* Separator */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 1,
            margin: { bottom: fontSize }
          }}
          uiBackground={{ color: COLOR.WHITE_OPACITY_1 }}
        />

        {/* Favorites + Updated */}
        <Row uiTransform={{ width: '100%' }}>
          <Column uiTransform={{ width: '50%', alignItems: 'center' }}>
            <UiEntity
              uiText={{
                value: '<b>FAVORITES</b>',
                fontSize: fontSizeSmall,
                color: COLOR.TEXT_COLOR_LIGHT_GREY
              }}
            />
            <UiEntity
              uiText={{
                value: `${favoritesCount}`,
                fontSize: fontSizeCaption,
                color: COLOR.TEXT_COLOR_WHITE
              }}
            />
          </Column>
          <Column uiTransform={{ width: '50%', alignItems: 'center' }}>
            <UiEntity
              uiText={{
                value: '<b>UPDATED</b>',
                fontSize: fontSizeSmall,
                color: COLOR.TEXT_COLOR_LIGHT_GREY
              }}
            />
            <UiEntity
              uiText={{
                value: formatDate(place.updated_at),
                fontSize: fontSizeCaption,
                color: COLOR.TEXT_COLOR_WHITE
              }}
            />
          </Column>
        </Row>
      </Column>
    </PopupBackdrop>
  )
}

function ActionIconButton({
  fontSize,
  spriteName,
  atlasName = 'icons',
  active,
  pulsing,
  onClick
}: {
  fontSize: number
  spriteName: string
  atlasName?: Atlas
  active: boolean
  pulsing: boolean
  onClick: () => void
}): ReactElement {
  const size = fontSize * 2.2
  return (
    <UiEntity
      uiTransform={{
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center',
        margin: { right: fontSize * 0.3 },
        opacity: pulsing ? getLoadingAlphaValue() : 1
      }}
      uiBackground={{
        color: active ? COLOR.WHITE_OPACITY_1 : COLOR.BLACK_TRANSPARENT
      }}
      onMouseDown={onClick}
    >
      <Icon
        icon={{ spriteName, atlasName }}
        iconSize={fontSize}
        iconColor={COLOR.WHITE}
      />
    </UiEntity>
  )
}

function ShareMenu({
  fontSize,
  fontSizeSmall,
  onShareX,
  onCopyLink
}: {
  fontSize: number
  fontSizeSmall: number
  onShareX: () => void
  onCopyLink: () => void
}): ReactElement {
  return (
    <Column
      uiTransform={{
        positionType: 'absolute',
        position: { top: fontSize * 2.5, right: 0 },
        padding: fontSize * 0.5,
        borderRadius: fontSize / 2,
        alignItems: 'flex-start'
      }}
      uiBackground={{ color: COLOR.BLACK_POPUP_BACKGROUND }}
    >
      <Row
        uiTransform={{
          alignItems: 'center',
          padding: fontSize * 0.3
        }}
        onMouseDown={onShareX}
      >
        <Icon
          icon={{ spriteName: 'Twitter', atlasName: 'social' }}
          iconSize={fontSizeSmall}
          iconColor={COLOR.WHITE}
        />
        <UiEntity
          uiText={{
            value: ' Share on X',
            fontSize: fontSizeSmall,
            color: COLOR.WHITE,
            textWrap: 'nowrap'
          }}
        />
      </Row>
      <Row
        uiTransform={{
          alignItems: 'center',
          padding: fontSize * 0.3
        }}
        onMouseDown={onCopyLink}
      >
        <Icon
          icon={{ spriteName: 'Link', atlasName: 'social' }}
          iconSize={fontSizeSmall}
          iconColor={COLOR.WHITE}
        />
        <UiEntity
          uiText={{
            value: ' Copy link',
            fontSize: fontSizeSmall,
            color: COLOR.WHITE,
            textWrap: 'nowrap'
          }}
        />
      </Row>
    </Column>
  )
}
