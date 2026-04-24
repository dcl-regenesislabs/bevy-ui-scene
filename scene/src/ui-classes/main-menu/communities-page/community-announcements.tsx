import ReactEcs, { Input, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { AvatarCircle } from '../../../components/avatar-circle'
import {
  type CommunityMemberRole,
  type CommunityPost
} from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { showErrorPopup } from '../../../service/error-popup-service'
import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import {
  createCommunityPost,
  fetchCommunityPosts
} from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import { CommunityPostItem } from './community-post-item'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

const POST_MAX_LENGTH = 500

export function CommunityAnnouncements({
  communityId,
  viewerRole
}: {
  communityId: string
  viewerRole: CommunityMemberRole
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const scale = getContentScaleRatio()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const canCompose = viewerRole === 'owner' || viewerRole === 'moderator'

  useEffect(() => {
    executeTask(async () => {
      try {
        const result = await fetchCommunityPosts(communityId, 0, 20)
        setPosts(result.posts ?? [])
      } catch (error) {
        console.error('[communities] failed to load posts', error)
      }
      setLoading(false)
    })
  }, [])

  const onPostCreated = (post: CommunityPost): void => {
    setPosts((prev) => [post, ...(prev ?? [])])
  }

  const onPostDeleted = (postId: string): void => {
    setPosts((prev) => (prev ?? []).filter((p) => p.id !== postId))
  }

  return (
    <Column uiTransform={{ width: '100%' }}>
      {canCompose && (
        <Composer communityId={communityId} onPosted={onPostCreated} />
      )}

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <UiEntity
            key={i}
            uiTransform={{
              width: '100%',
              height: scale * 150,
              margin: { bottom: fontSize }
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
        ))
      ) : (posts ?? []).length === 0 ? (
        <UiEntity
          uiTransform={{ width: '100%', margin: { top: fontSize } }}
          uiText={{
            value: 'No announcements yet',
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_GREY,
            textAlign: 'middle-center'
          }}
        />
      ) : (
        (posts ?? []).map((post) => (
          <CommunityPostItem
            key={post.id}
            post={post}
            viewerRole={viewerRole}
            onDeleted={onPostDeleted}
          />
        ))
      )}
    </Column>
  )
}

function Composer({
  communityId,
  onPosted
}: {
  communityId: string
  onPosted: (post: CommunityPost) => void
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const fontSizeCaption = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const avatarSize = fontSize * 2.5
  const myAddress = (getPlayer()?.userId ?? '').toLowerCase()

  const [text, setText] = useState<string>('')
  const [posting, setPosting] = useState<boolean>(false)
  // The DCL react-ecs Input keeps its on-screen text even when the `value`
  // prop is reset (same `TODO REVIEW workaround` you'll find in
  // components/chat/chat-input.tsx). Bumping this counter as a `key` on the
  // Input forces a remount and clears the visible text after each post.
  const [resetCounter, setResetCounter] = useState<number>(0)

  const trimmed = text.trim()
  const canPost = !posting && trimmed.length > 0

  const onPost = (): void => {
    if (!canPost) return
    setPosting(true)
    executeTask(async () => {
      try {
        const created = await createCommunityPost(communityId, trimmed)
        onPosted(created)
        setText('')
        setResetCounter((n) => n + 1)
      } catch (error) {
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'createCommunityPost'
        )
      } finally {
        setPosting(false)
      }
    })
  }

  return (
    <Row
      uiTransform={{
        width: '100%',
        alignItems: 'flex-start',
        margin: { bottom: fontSize }
      }}
    >
      <AvatarCircle
        userId={myAddress}
        circleColor={COLOR.WHITE_OPACITY_5}
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
          padding: fontSize / 2
        }}
        uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
      >
        <Input
          key={`composer-${resetCounter}`}
          uiTransform={{
            width: '100%',
            height: fontSize * 4,
            borderRadius: fontSize / 4,
            borderWidth: 0,
            padding: { left: fontSize * 0.5, top: fontSize * 0.3 }
          }}
          uiBackground={{ color: COLOR.BLACK_TRANSPARENT }}
          value={text}
          placeholder="Any Announcement to share with your Community?"
          placeholderColor={COLOR.TEXT_COLOR_LIGHT_GREY}
          fontSize={fontSize}
          color={COLOR.TEXT_COLOR_WHITE}
          disabled={posting}
          onChange={(value) => {
            if (value.length <= POST_MAX_LENGTH) setText(value)
          }}
        />
        <Row
          uiTransform={{
            width: '100%',
            margin: { top: fontSize * 0.4 },
            alignItems: 'center',
            justifyContent: 'flex-end'
          }}
        >
          <UiEntity
            uiTransform={{ flexGrow: 1 }}
            uiText={{
              value: `${text.length} / ${POST_MAX_LENGTH}`,
              fontSize: fontSizeCaption,
              color: COLOR.TEXT_COLOR_LIGHT_GREY,
              textAlign: 'middle-left'
            }}
          />
          <UiEntity
            uiTransform={{
              width: 'auto',
              borderRadius: fontSize / 2,
              padding: {
                left: fontSize,
                right: fontSize,
                top: fontSize * 0.4,
                bottom: fontSize * 0.4
              },
              opacity: posting ? getLoadingAlphaValue() : canPost ? 1 : 0.4
            }}
            uiBackground={{ color: COLOR.BUTTON_PRIMARY }}
            uiText={{
              value: '<b>POST</b>',
              fontSize: fontSizeSmall,
              color: COLOR.WHITE
            }}
            onMouseDown={onPost}
          />
        </Row>
      </Column>
    </Row>
  )
}
