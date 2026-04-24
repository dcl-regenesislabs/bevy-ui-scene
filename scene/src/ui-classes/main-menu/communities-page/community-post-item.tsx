import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import {
  type CommunityMemberRole,
  type CommunityPost
} from '../../../service/communities-types'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import { AvatarCircle } from '../../../components/avatar-circle'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'
import { PlayerNameComponent } from '../../../components/player-name-component'
import Icon from '../../../components/icon/Icon'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import {
  deleteCommunityPost,
  likeCommunityPost,
  unlikeCommunityPost
} from '../../../utils/communities-promise-utils'
import { showErrorPopup } from '../../../service/error-popup-service'
import { noop } from '../../../utils/function-utils'
import { showConfirmPopup } from '../../../components/confirm-popup'
import useState = ReactEcs.useState

function formatPostDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ]
    return `${months[date.getMonth()]} ${date.getDate()}`
  } catch {
    return dateStr
  }
}

export function CommunityPostItem({
  post,
  viewerRole = 'unknown',
  onDeleted = noop
}: {
  post: CommunityPost
  viewerRole?: CommunityMemberRole
  onDeleted?: (postId: string) => void
  key: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const avatarSize = fontSize * 2.5
  const date = formatPostDate(post.createdAt)
  const [isLiked, setIsLiked] = useState<boolean>(post.isLikedByUser)
  const [likesCount, setLikesCount] = useState<number>(post.likesCount)
  const [liking, setLiking] = useState<boolean>(false)
  // Delete is allowed for owners/moderators of the community, and for the
  // post's author on their own posts. Mirrors unity-explorer behavior plus
  // the explicit owner+moderator gate the user asked for.
  const myAddress = (getPlayer()?.userId ?? '').toLowerCase()
  const isAuthor = post.authorAddress.toLowerCase() === myAddress
  const canDelete =
    viewerRole === 'owner' || viewerRole === 'moderator' || isAuthor

  const onDelete = (): void => {
    showConfirmPopup({
      title: 'Delete this announcement?',
      message: 'This action cannot be undone.',
      icon: {
        spriteName: 'Delete',
        atlasName: 'icons',
        backgroundColor: COLOR.BUTTON_PRIMARY
      },
      confirmLabel: 'DELETE',
      onConfirm: async () => {
        await deleteCommunityPost(post.communityId, post.id)
        onDeleted(post.id)
      }
    })
  }

  const toggleLike = (): void => {
    if (liking) return
    const nextIsLiked = !isLiked
    const nextCount = likesCount + (nextIsLiked ? 1 : -1)
    // Optimistic update
    setIsLiked(nextIsLiked)
    setLikesCount(nextCount)
    setLiking(true)
    executeTask(async () => {
      try {
        if (nextIsLiked) {
          await likeCommunityPost(post.communityId, post.id)
        } else {
          await unlikeCommunityPost(post.communityId, post.id)
        }
        // Mutate the shared post object so the posts cache stays consistent.
        post.isLikedByUser = nextIsLiked
        post.likesCount = nextCount
      } catch (error) {
        // Revert optimistic update.
        setIsLiked(!nextIsLiked)
        setLikesCount(likesCount)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          `${nextIsLiked ? 'like' : 'unlike'}CommunityPost`
        )
      } finally {
        setLiking(false)
      }
    })
  }

  return (
    <Row
      uiTransform={{
        width: '100%',
        margin: { bottom: fontSize * 0.3 },
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      }}
    >
      <AvatarCircle
        userId={post.authorAddress}
        circleColor={getAddressColor(post.authorAddress)}
        uiTransform={{
          width: avatarSize,
          height: avatarSize,
          margin: { right: fontSize * 0.5 }
        }}
        isGuest={false}
      />
      <Column
        uiTransform={{
          flexGrow: 1,
          borderRadius: fontSize / 2,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: fontSize / 2
        }}
        uiBackground={{
          color: COLOR.DARK_OPACITY_5
        }}
      >
        <Row
          uiTransform={{
            alignItems: 'center'
          }}
        >
          <PlayerNameComponent
            uiTransform={{
              borderWidth: 0,
              borderColor: COLOR.GREEN
            }}
            name={post.authorName}
            address={post.authorAddress}
            hasClaimedName={post.authorHasClaimedName}
            fontSize={fontSize}
          />
          <UiEntity
            uiTransform={{
              flexGrow: 1
            }}
          >
            <UiEntity
              uiText={{
                value: `· ${date}`,
                fontSize,
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                textWrap: 'nowrap',
                textAlign: 'middle-left'
              }}
            />
          </UiEntity>
          {/* Like count */}
          <Row
            uiTransform={{
              width: 'auto',
              opacity: liking ? getLoadingAlphaValue() : 1
            }}
            onMouseDown={toggleLike}
          >
            <Icon
              icon={{
                spriteName: isLiked ? 'Like solid' : 'Like',
                atlasName: 'icons'
              }}
              iconSize={fontSize}
              iconColor={COLOR.TEXT_COLOR_LIGHT_GREY}
            />
            <UiEntity
              uiTransform={{
                alignSelf: 'flex-end'
              }}
              uiText={{
                value: `${likesCount}`,
                fontSize,
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                textAlign: 'middle-right'
              }}
            />
          </Row>
          {/* Delete (owner/mod or author) */}
          {canDelete && (
            <UiEntity
              uiTransform={{
                width: 'auto',
                margin: { left: fontSize * 0.5 }
              }}
              onMouseDown={onDelete}
            >
              <Icon
                icon={{ spriteName: 'Delete', atlasName: 'icons' }}
                iconSize={fontSize}
                iconColor={COLOR.WHITE}
              />
            </UiEntity>
          )}
        </Row>

        <UiEntity
          uiTransform={{
            width: '100%'
          }}
          uiText={{
            value: post.content,
            fontSize,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'top-left',
            textWrap: 'wrap'
          }}
        />
      </Column>
    </Row>
  )
}
