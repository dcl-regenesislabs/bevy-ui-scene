import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column } from '../../../components/layout'
import { type CommunityPost } from '../../../service/communities-types'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { executeTask } from '@dcl/sdk/ecs'
import { fetchCommunityPosts } from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import { CommunityPostItem } from './community-post-item'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

export function CommunityAnnouncements({
  communityId
}: {
  communityId: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const scale = getContentScaleRatio()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState<boolean>(true)

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

  if (loading) {
    return (
      <Column uiTransform={{ width: '100%' }}>
        {Array.from({ length: 3 }).map((_, i) => (
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
        ))}
      </Column>
    )
  }

  if ((posts ?? []).length === 0) {
    return (
      <UiEntity
        uiText={{
          value: 'No announcements yet',
          fontSize,
          color: COLOR.TEXT_COLOR_GREY
        }}
      />
    )
  }

  return (
    <Column uiTransform={{ width: '100%' }}>
      {(posts ?? []).map((post) => (
        <CommunityPostItem key={post.id} post={post} />
      ))}
    </Column>
  )
}
