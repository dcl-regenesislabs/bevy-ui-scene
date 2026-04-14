import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column } from '../../../components/layout'
import { executeTask } from '@dcl/sdk/ecs'
import { fetchCommunities } from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import { type CommunityListItem } from '../../../service/communities-types'
import {
  BROWSE_CARD_HEIGHT,
  BROWSE_CARD_WIDTH,
  CommunityBrowseCard
} from './community-browse-card'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

const BROWSE_PAGE_SIZE = 10

async function fetchAllBrowseCommunities(
  onBatch: (
    communities: CommunityListItem[],
    total: number,
    hasMore: boolean
  ) => void,
  cancelled: { current: boolean },
  search?: string
): Promise<void> {
  let offset = 0
  let hasMore = true

  while (hasMore && !cancelled.current) {
    try {
      const result = await fetchCommunities({
        limit: BROWSE_PAGE_SIZE,
        offset,
        search: search != null && search.length > 0 ? search : undefined
      })
      if (cancelled.current) return
      hasMore = result.results.length === BROWSE_PAGE_SIZE
      offset += result.results.length
      onBatch(result.results, result.total, hasMore)
    } catch (error) {
      console.error('[communities] failed to load browse page', error)
      hasMore = false
      onBatch([], 0, false)
    }
  }
}

let browseCancelled = { current: false }

export function startBrowseLoad(
  search: string | undefined,
  setBrowseCommunities: (
    fn: (prev: CommunityListItem[]) => CommunityListItem[]
  ) => void,
  setBrowseTotal: (n: number) => void,
  setLoadingBrowse: (b: boolean) => void,
  setLoadingMore: (b: boolean) => void
): void {
  browseCancelled.current = true
  browseCancelled = { current: false }
  const cancelled = browseCancelled

  setBrowseCommunities(() => [])
  setLoadingBrowse(true)
  setLoadingMore(false)

  executeTask(async () => {
    let isFirst = true
    await fetchAllBrowseCommunities(
      (batch, total, hasMore) => {
        if (cancelled.current) return
        setBrowseCommunities((prev) => [...(prev ?? []), ...batch])
        setBrowseTotal(total)
        if (isFirst) {
          setLoadingBrowse(false)
          isFirst = false
        }
        setLoadingMore(hasMore)
      },
      cancelled,
      search
    )
  })
}

export function cancelBrowseLoad(): void {
  browseCancelled.current = true
}

export function CommunitiesCatalog({
  searchText = ''
}: {
  searchText?: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.SIDE })
  const [browseCommunities, setBrowseCommunities] = useState<
    CommunityListItem[]
  >([])
  const [browseTotal, setBrowseTotal] = useState<number>(0)
  const [loadingBrowse, setLoadingBrowse] = useState<boolean>(true)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [lastSearch, setLastSearch] = useState<string>('')

  const currentSearch = searchText ?? ''
  if (currentSearch !== (lastSearch ?? '')) {
    setLastSearch(currentSearch)
    startBrowseLoad(
      currentSearch.length > 0 ? currentSearch : undefined,
      setBrowseCommunities,
      setBrowseTotal,
      setLoadingBrowse,
      setLoadingMore
    )
  }

  useEffect(() => {
    startBrowseLoad(
      undefined,
      setBrowseCommunities,
      setBrowseTotal,
      setLoadingBrowse,
      setLoadingMore
    )

    return () => {
      cancelBrowseLoad()
    }
  }, [])

  return (
    <Column uiTransform={{ width: '100%', height: '100%' }}>
      <UiEntity
        uiTransform={{
          width: '100%',
          flexShrink: 0,
          margin: { bottom: fontSize, left: -fontSize / 2 }
        }}
        uiText={{
          value: `<b>Browse Communities  (${browseTotal ?? 0})</b>`,
          fontSize: getFontSize({
            context: CONTEXT.SIDE,
            token: TYPOGRAPHY_TOKENS.BODY
          }),
          color: COLOR.TEXT_COLOR_WHITE,
          textAlign: 'top-left'
        }}
      />
      <UiEntity
        uiTransform={{
          width: '100%',
          flexGrow: 1,
          flexWrap: 'wrap',
          flexDirection: 'row',
          overflow: 'scroll',
          scrollVisible: 'vertical'
        }}
      >
        {loadingBrowse
          ? Array.from({ length: 10 }).map((_, i) => (
              <UiEntity
                key={i}
                uiTransform={{
                  width: BROWSE_CARD_WIDTH(),
                  height: BROWSE_CARD_HEIGHT(),
                  margin: {
                    right: fontSize,
                    bottom: fontSize
                  }
                }}
              >
                <LoadingPlaceholder
                  uiTransform={{
                    width: '100%',
                    height: '100%',
                    borderRadius: fontSize / 2,
                    margin: {
                      right: fontSize,
                      bottom: fontSize
                    }
                  }}
                />
              </UiEntity>
            ))
          : [
              ...(browseCommunities ?? []).map((community) => (
                <CommunityBrowseCard key={community.id} community={community} />
              )),
              ...(loadingMore
                ? Array.from({ length: 5 }).map((_, i) => (
                    <UiEntity
                      key={`loading-${i}`}
                      uiTransform={{
                        width: BROWSE_CARD_WIDTH(),
                        height: BROWSE_CARD_HEIGHT(),
                        margin: {
                          right: fontSize,
                          bottom: fontSize
                        }
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
                : [])
            ]}
      </UiEntity>
    </Column>
  )
}
