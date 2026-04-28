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
import {
  listenPlaceChanged,
  updateCachedCommunityPlace
} from '../../../utils/communities-promise-utils'
import { BevyApi } from '../../../bevy-api'
import { executeTask } from '@dcl/sdk/ecs'
import { AvatarCircle } from '../../../components/avatar-circle'
import { ZERO_ADDRESS } from '../../../utils/constants'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'
import {
  changeRealm,
  copyToClipboard,
  openExternalUrl,
  teleportTo
} from '~system/RestrictedActions'
import { currentRealmProviderIsWorld } from '../../../service/realm-change'
import { showErrorPopup } from '../../../service/error-popup-service'
import { type Color4, Vector2 } from '@dcl/sdk/math'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

function formatDate(dateStr: string | null | undefined): string {
  if (dateStr == null) return ''
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
  const fontSizeAction = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
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

  const thumbnailWidth = fontSize * 27
  const thumbnailHeight = thumbnailWidth * 0.75

  const [isFav, setIsFav] = useState<boolean>(place.user_favorite ?? false)
  const [isLiked, setIsLiked] = useState<boolean>(place.user_like ?? false)
  const [isDisliked, setIsDisliked] = useState<boolean>(
    place.user_dislike ?? false
  )
  const [likesCount, setLikesCount] = useState<number>(place.likes)
  const [dislikesCount, setDislikesCount] = useState<number>(place.dislikes)
  const [favoritesCount, setFavoritesCount] = useState<number>(place.favorites)
  const [updatingFav, setUpdatingFav] = useState<boolean>(false)
  const [updatingLike, setUpdatingLike] = useState<boolean>(false)
  const [shareOpen, setShareOpen] = useState<boolean>(false)
  const [isHome, setIsHome] = useState<boolean>(false)

  // Resolve whether this place's base parcel is the user's current home.
  useEffect(() => {
    const target = parseCoordinates(place.base_position)
    if (target == null) return
    executeTask(async () => {
      try {
        const home = await BevyApi.getHomeScene()
        setIsHome(home.parcel.x === target.x && home.parcel.y === target.y)
      } catch {
        // No-op: leave the icon as outline if we can't read the home.
      }
    })
  }, [])

  // Stay in sync with cache mutations from elsewhere (e.g. another popup of
  // the same place reopened over a stale dispatch payload).
  useEffect(() => {
    return listenPlaceChanged(place.id, (partial) => {
      if (partial.user_favorite !== undefined) setIsFav(partial.user_favorite)
      if (partial.favorites !== undefined) setFavoritesCount(partial.favorites)
      if (partial.user_like !== undefined) setIsLiked(partial.user_like)
      if (partial.user_dislike !== undefined) {
        setIsDisliked(partial.user_dislike)
      }
      if (partial.likes !== undefined) setLikesCount(partial.likes)
      if (partial.dislikes !== undefined) setDislikesCount(partial.dislikes)
    })
  }, [])

  const likeRate =
    likesCount + dislikesCount > 0
      ? Math.round((likesCount / (likesCount + dislikesCount)) * 100)
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
      likesCount,
      dislikesCount
    }
    let nextIsLiked = isLiked
    let nextIsDisliked = isDisliked
    let nextLikes = likesCount
    let nextDislikes = dislikesCount
    let apiArg: boolean | null
    if (target === 'like') {
      nextIsLiked = !isLiked
      nextLikes = likesCount + (nextIsLiked ? 1 : -1)
      // Toggling like also clears any pre-existing dislike.
      if (isDisliked) {
        nextIsDisliked = false
        nextDislikes = Math.max(0, dislikesCount - 1)
      }
      apiArg = nextIsLiked ? true : null
    } else {
      nextIsDisliked = !isDisliked
      nextDislikes = dislikesCount + (nextIsDisliked ? 1 : -1)
      if (isLiked) {
        nextIsLiked = false
        nextLikes = Math.max(0, likesCount - 1)
      }
      apiArg = nextIsDisliked ? false : null
    }
    setIsLiked(nextIsLiked)
    setIsDisliked(nextIsDisliked)
    setLikesCount(Math.max(0, nextLikes))
    setDislikesCount(Math.max(0, nextDislikes))
    setUpdatingLike(true)
    executeTask(async () => {
      try {
        await updateLikeStatus(place.id, apiArg)
        updateCachedCommunityPlace(place.id, {
          user_like: nextIsLiked,
          user_dislike: nextIsDisliked,
          likes: Math.max(0, nextLikes),
          dislikes: Math.max(0, nextDislikes)
        })
      } catch (error) {
        setIsLiked(prev.isLiked)
        setIsDisliked(prev.isDisliked)
        setLikesCount(prev.likesCount)
        setDislikesCount(prev.dislikesCount)
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
      realm: 'http://realm-provider-ea.decentraland.org/main',
      parcel
    })
    setIsHome(true)
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
            realm: 'https://realm-provider.decentraland.org/main'
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
          width: getContentScaleRatio() * 2222,
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
              width: thumbnailWidth,
              height: thumbnailHeight,
              borderRadius: fontSize,
              flexShrink: 0,
              margin: { right: fontSize }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: place.image ?? '' }
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
                value: `<b>${place.title ?? ''}</b>`,
                fontSize: fontSizeTitle,
                color: COLOR.TEXT_COLOR_WHITE,
                textAlign: 'top-left'
              }}
            />
            {place.contact_name != null && place.contact_name.length > 0 && (
              <Row
                uiTransform={{
                  width: 'auto',
                  alignItems: 'center',
                  margin: { top: -fontSize * 0.5, left: fontSize }
                }}
              >
                <AvatarCircle
                  userId={place.creator_address ?? ZERO_ADDRESS}
                  circleColor={getAddressColor(
                    (place.creator_address ?? ZERO_ADDRESS).toLowerCase()
                  )}
                  uiTransform={{
                    width: fontSize * 1.6,
                    height: fontSize * 1.6
                  }}
                  isGuest={false}
                />
                <UiEntity
                  uiText={{
                    value: `created by <b><color=#FFFFFF>${place.contact_name}</color></b>`,
                    fontSize,
                    color: COLOR.TEXT_COLOR_LIGHT_GREY,
                    textAlign: 'middle-left'
                  }}
                />
              </Row>
            )}

            {/* Stats: views + like rate */}
            <Row
              uiTransform={{
                alignItems: 'center',
                margin: {
                  top: fontSize * 2,
                  bottom: fontSize * 0.5,
                  left: fontSize
                }
              }}
            >
              <Icon
                uiTransform={{
                  width: fontSize,
                  height: fontSize * 0.75,
                  flexShrink: 0,
                  flexGrow: 0
                }}
                icon={{ spriteName: 'PreviewIcn', atlasName: 'map2' }}
                iconSize={fontSize}
                iconColor={COLOR.WHITE}
              />
              <UiEntity
                uiTransform={{
                  margin: { right: fontSize * 0.8, left: -fontSize / 2 }
                }}
                uiText={{
                  value: ` ${place.user_visits ?? 0}`,
                  fontSize,
                  color: COLOR.WHITE
                }}
              />
              <Icon
                icon={{ spriteName: 'Like', atlasName: 'icons' }}
                iconSize={fontSize}
                iconColor={COLOR.WHITE}
              />
              <UiEntity
                uiTransform={{
                  margin: { right: fontSize * 0.8, left: -fontSize / 2 }
                }}
                uiText={{
                  value: ` ${likeRate}%`,
                  fontSize,
                  color: COLOR.WHITE
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
                fontSize={fontSizeAction}
                spriteName={isLiked ? 'Like solid' : 'Like'}
                pulsing={updatingLike}
                onClick={() => {
                  setLike('like')
                }}
              />
              <ActionIconButton
                fontSize={fontSizeAction}
                spriteName={isDisliked ? 'Dislike solid' : 'Dislike'}
                pulsing={updatingLike}
                onClick={() => {
                  setLike('dislike')
                }}
              />
              <ActionIconButton
                fontSize={fontSizeAction}
                spriteName={isFav ? 'HeartOnOutlined' : 'HeartOffOutlined'}
                atlasName="toggles"
                pulsing={updatingFav}
                iconColor={isFav ? COLOR.RED : COLOR.WHITE}
                onClick={toggleFav}
              />
              <ActionIconButton
                fontSize={fontSizeAction}
                spriteName={isHome ? 'Home' : 'HomeOutline'}
                atlasName="icons"
                pulsing={false}
                onClick={setHome}
              />
              <UiEntity uiTransform={{ flexDirection: 'column' }}>
                <ActionIconButton
                  fontSize={fontSizeAction}
                  spriteName="Share"
                  atlasName="context"
                  pulsing={false}
                  onClick={() => {
                    setShareOpen(!shareOpen)
                  }}
                />
                {shareOpen && (
                  <ShareMenu
                    fontSize={fontSizeAction}
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
                iconSize={fontSizeAction}
                iconColor={COLOR.WHITE}
              />
              <UiEntity
                uiText={{
                  value: '<b>JUMP IN</b>',
                  fontSize: fontSizeAction,
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
              fontSize: fontSize,
              color: COLOR.TEXT_COLOR_LIGHT_GREY,
              textAlign: 'top-left'
            }}
            uiTransform={{ width: '100%' }}
          />
          <UiEntity
            uiText={{
              value: place.description ?? '',
              fontSize: fontSize,
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
          <Column>
            <UiEntity
              uiText={{
                value: '<b>LOCATION</b>',
                fontSize: fontSize,
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                textAlign: 'top-left'
              }}
              uiTransform={{ width: '100%' }}
            />
            <Row
              uiTransform={{
                margin: { left: fontSize / 2 }
              }}
            >
              <Icon
                icon={{ spriteName: 'PinIcn', atlasName: 'icons' }}
                iconSize={fontSize}
                iconColor={COLOR.TEXT_COLOR_WHITE}
              />
              <UiEntity
                uiText={{
                  value: ` ${place.base_position}`,
                  fontSize: fontSize,
                  color: COLOR.TEXT_COLOR_WHITE
                }}
              />
            </Row>
          </Column>
          <Column>
            <UiEntity
              uiText={{
                value: '<b>PARCELS</b>',
                fontSize,
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                textAlign: 'top-left'
              }}
              uiTransform={{ width: '100%' }}
            />
            <Row
              uiTransform={{
                margin: { left: fontSize / 2 }
              }}
            >
              <Icon
                icon={{ spriteName: 'ParcelsIcn', atlasName: 'map2' }}
                iconSize={fontSize}
                iconColor={COLOR.TEXT_COLOR_WHITE}
              />
              <UiEntity
                uiText={{
                  value: `${place.positions?.length ?? 0}`,
                  fontSize: fontSize,
                  color: COLOR.TEXT_COLOR_WHITE,
                  textAlign: 'top-left'
                }}
                uiTransform={{ width: '100%' }}
              />
            </Row>
          </Column>

          <Column>
            <UiEntity
              uiText={{
                value: '<b>FAVORITES</b>',
                fontSize,
                color: COLOR.TEXT_COLOR_LIGHT_GREY
              }}
            />
            <UiEntity
              uiText={{
                value: `${favoritesCount}`,
                fontSize,
                color: COLOR.TEXT_COLOR_WHITE
              }}
            />
          </Column>
          <Column>
            <UiEntity
              uiText={{
                value: '<b>UPDATED</b>',
                fontSize,
                color: COLOR.TEXT_COLOR_LIGHT_GREY
              }}
            />
            <UiEntity
              uiText={{
                value: formatDate(place.updated_at),
                fontSize,
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
  pulsing,
  iconColor = COLOR.WHITE,
  onClick
}: {
  fontSize: number
  spriteName: string
  atlasName?: Atlas
  pulsing: boolean
  iconColor?: Color4
  onClick: () => void
}): ReactElement {
  const size = fontSize * 2
  return (
    <UiEntity
      uiTransform={{
        width: size * 2,
        height: size,
        borderRadius: fontSize / 2,
        justifyContent: 'center',
        alignItems: 'center',
        margin: { right: fontSize * 0.3 },
        opacity: pulsing ? getLoadingAlphaValue() : 1
      }}
      uiBackground={{
        color: COLOR.WHITE_OPACITY_0
      }}
      onMouseDown={onClick}
    >
      <Icon
        icon={{ spriteName, atlasName }}
        iconSize={fontSize}
        iconColor={iconColor}
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
