import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { executeTask } from '@dcl/sdk/ecs'
import {
  fetchCommunityPlaces,
  updateCachedCommunityPlace
} from '../../../utils/communities-promise-utils'
import { updateLikeStatus } from '../../../utils/promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import type { PlaceFromApi } from '../../scene-info-card/SceneInfoCard.types'
import Icon from '../../../components/icon/Icon'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { showErrorPopup } from '../../../service/error-popup-service'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

function CommunityPlaceCard({
  place
}: {
  place: PlaceFromApi
  key: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  const fontSizeCaption = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const cardWidth = fontSize * 14
  const imageHeight = cardWidth * 0.65
  const cardHeight = imageHeight + fontSize * 3
  const [isLiked, setIsLiked] = useState<boolean>(place.user_like ?? false)
  const [likeRate, setLikeRate] = useState<number | null>(
    place.like_rate ?? null
  )
  const [likes, setLikes] = useState<number>(place.likes ?? 0)
  const [dislikes, setDislikes] = useState<number>(place.dislikes ?? 0)
  const [updatingLike, setUpdatingLike] = useState<boolean>(false)
  const likePercent = likeRate != null ? `${Math.round(likeRate * 100)}%` : '0%'

  const toggleLike = (): void => {
    if (updatingLike) return
    const prev = { isLiked, likes, dislikes, likeRate }
    const nextIsLiked = !isLiked
    const nextLikes = likes + (nextIsLiked ? 1 : -1)
    const total = nextLikes + dislikes
    const nextRate = total > 0 ? nextLikes / total : null
    setIsLiked(nextIsLiked)
    setLikes(Math.max(0, nextLikes))
    setLikeRate(nextRate)
    setUpdatingLike(true)
    executeTask(async () => {
      try {
        // `null` clears any like/dislike; `true` sets a like.
        await updateLikeStatus(place.id, nextIsLiked ? true : null)
        updateCachedCommunityPlace(place.id, {
          user_like: nextIsLiked,
          user_dislike: false,
          likes: Math.max(0, nextLikes),
          like_rate: nextRate
        })
      } catch (error) {
        setIsLiked(prev.isLiked)
        setLikes(prev.likes)
        setDislikes(prev.dislikes)
        setLikeRate(prev.likeRate)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'updateLikeStatus'
        )
      } finally {
        setUpdatingLike(false)
      }
    })
  }

  return (
    <Column
      uiTransform={{
        width: cardWidth,
        height: cardHeight,
        margin: { right: fontSize * 0.5, bottom: fontSize * 0.5 },
        flexShrink: 0
      }}
      onMouseDown={() => {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.COMMUNITY_PLACE_INFO,
            data: place
          })
        )
      }}
    >
      {/* Thumbnail */}
      <UiEntity
        uiTransform={{
          width: cardWidth,
          height: imageHeight,
          borderRadius: fontSize,
          flexShrink: 0
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: place.image ?? '' }
        }}
      >
        {/* User count badge */}
        {place.user_count > 0 && (
          <Row
            uiTransform={{
              positionType: 'absolute',
              position: { top: fontSizeSmall * 0.5, left: fontSizeSmall * 0.5 },
              borderRadius: fontSizeSmall,
              padding: {
                left: fontSizeSmall * 0.5,
                right: fontSizeSmall * 0.5,
                top: fontSizeSmall * 0.2,
                bottom: fontSizeSmall * 0.2
              },
              alignItems: 'center'
            }}
            uiBackground={{ color: COLOR.BLACK_POPUP_BACKGROUND }}
          >
            <UiEntity
              uiTransform={{
                width: fontSizeSmall * 0.6,
                height: fontSizeSmall * 0.6,
                borderRadius: fontSizeSmall,
                margin: { right: fontSizeSmall * 0.3 }
              }}
              uiBackground={{ color: COLOR.GREEN }}
            />
            <Icon
              icon={{ spriteName: 'Members', atlasName: 'icons' }}
              iconSize={fontSizeSmall}
              iconColor={COLOR.WHITE}
            />
            <UiEntity
              uiText={{
                value: `${place.user_count}`,
                fontSize: fontSizeSmall,
                color: COLOR.WHITE
              }}
            />
          </Row>
        )}
        {/* Featured badge */}
        {place.highlighted && (
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: {
                top: fontSizeSmall * 0.5,
                right: fontSizeSmall * 0.5
              },
              borderRadius: fontSizeSmall,
              padding: {
                left: fontSizeSmall * 0.5,
                right: fontSizeSmall * 0.5,
                top: fontSizeSmall * 0.2,
                bottom: fontSizeSmall * 0.2
              }
            }}
            uiBackground={{ color: COLOR.BUTTON_PRIMARY }}
            uiText={{
              value: 'Featured',
              fontSize: fontSizeSmall,
              color: COLOR.WHITE
            }}
          />
        )}
      </UiEntity>

      {/* Name */}
      <UiEntity
        uiTransform={{
          width: '100%',
          margin: { top: -fontSizeSmall * 0.3 }
        }}
        uiText={{
          value: `<b>${place.title ?? ''}</b>`,
          fontSize: fontSizeSmall,
          color: COLOR.TEXT_COLOR_WHITE,
          textAlign: 'top-left',
          textWrap: 'nowrap'
        }}
      />

      {/* Like + Coords */}
      <Row
        uiTransform={{
          width: '100%',
          alignItems: 'center',
          margin: { top: fontSizeCaption, left: fontSizeCaption }
        }}
      >
        <Row
          uiTransform={{
            width: 'auto',
            alignItems: 'center',
            opacity: updatingLike ? getLoadingAlphaValue() : 1,
            margin: { right: fontSizeCaption * 0.5 },
            flexShrink: 0
          }}
        >
          <Icon
            icon={{
              spriteName: isLiked ? 'Like solid' : 'Like',
              atlasName: 'icons'
            }}
            iconSize={fontSizeCaption}
            iconColor={COLOR.WHITE}
          />
          <UiEntity
            uiText={{
              value: `<b>${likePercent}</b>`,
              fontSize: fontSizeCaption,
              color: COLOR.WHITE
            }}
          />
        </Row>
        <Row
          uiTransform={{
            flexGrow: 0,
            flexShrink: 0,
            width: 'auto',
            borderRadius: fontSizeCaption / 2,
            padding: { left: fontSizeCaption, right: fontSizeCaption }
          }}
          uiBackground={{ color: COLOR.WHITE_OPACITY_1 }}
        >
          <Icon
            icon={{ spriteName: 'PinIcn', atlasName: 'icons' }}
            iconSize={fontSizeCaption}
            iconColor={COLOR.WHITE}
          />
          <UiEntity
            uiText={{
              value: place.base_position ?? '',
              fontSize: fontSizeCaption,
              color: COLOR.WHITE
            }}
          />
        </Row>
      </Row>
    </Column>
  )
}

export function CommunityPlaces({
  communityId
}: {
  communityId: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })

  const [places, setPlaces] = useState<PlaceFromApi[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      try {
        const resolved = await fetchCommunityPlaces(communityId)
        setPlaces(resolved)
      } catch (error) {
        console.error('[communities] failed to load places', error)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <Row uiTransform={{ width: '100%', flexWrap: 'wrap' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <UiEntity
            key={i}
            uiTransform={{
              width: fontSize * 280,
              height: fontSize * 220,
              margin: { right: fontSize * 0.5, bottom: fontSize * 0.5 }
            }}
          >
            <LoadingPlaceholder
              uiTransform={{
                width: '100%',
                height: '100%',
                borderRadius: fontSize / 2
              }}
            />
          </UiEntity>
        ))}
      </Row>
    )
  }

  if (places.length === 0) {
    return (
      <UiEntity
        uiText={{
          value: 'No places yet',
          fontSize,
          color: COLOR.TEXT_COLOR_GREY
        }}
      />
    )
  }

  return (
    <Row uiTransform={{ width: '100%', flexWrap: 'wrap' }}>
      {places.map((place) => (
        <CommunityPlaceCard key={place.id} place={place} />
      ))}
    </Row>
  )
}
