import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { ResponsiveContent } from '../../../components/responsive-content'
import { Column } from '../../../components/ui-system/layout'
import { type CommunityListItem } from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { CommunityAnnouncements } from './community-announcements'
import { CommunityMembers } from './community-members'
import { CommunityPlaces } from './community-places'
import { CommunityPhotos } from './community-photos'
import { CommunityUpcomingEvents } from './community-upcoming-events'
import { CommunityViewHeader } from './community-view-header'
import { PopupBigWindow } from '../../../components/popup-big-window'
import { type Tab, TabComponent } from '../../../components/tab-component'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import { fetchCommunity } from '../../../utils/communities-promise-utils'
import { executeTask } from '@dcl/sdk/ecs'
import useState = ReactEcs.useState
import { COLOR } from 'src/components/color-palette'
import useEffect = ReactEcs.useEffect

export const CommunityViewPopup: Popup = ({ shownPopup }) => {
  const initial = shownPopup.data as
    | (CommunityListItem & { needsFetch?: boolean })
    | null
  if (initial == null) return null
  return <CommunityViewContent initial={initial} />
}

function CommunityViewContent({
  initial
}: {
  initial: CommunityListItem & { needsFetch?: boolean }
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  // When opened from a notification we only have id/name/thumbnail, so the
  // popup opens instantly with a loader and fetches the full community here.
  const [community, setCommunity] = useState<CommunityListItem | null>(
    initial.needsFetch === true ? null : initial
  )
  const [activeTabIndex, setActiveTabIndex] = useState<number>(2)

  useEffect(() => {
    if (initial.needsFetch !== true) return
    executeTask(async () => {
      try {
        const data = await fetchCommunity(initial.id)
        const enriched = data as Partial<CommunityListItem>
        setCommunity({
          ...data,
          ownerName: enriched.ownerName ?? '',
          friends: enriched.friends ?? []
        })
      } catch {
        // Never hang on the loader — fall back to whatever we were given.
        setCommunity(initial)
      }
    })
  }, [])

  const COMMUNITY_TABS: Tab[] = [
    { text: '  ANNOUNCEMENTS  ' },
    { text: '  MEMBERS  ' },
    { text: '  PLACES  ' },
    { text: '  PHOTOS  ' }
  ]

  if (community == null) {
    return (
      <PopupBackdrop>
        <ResponsiveContent>
          <PopupBigWindow>
            <Column
              uiTransform={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <LoadingPlaceholder />
            </Column>
          </PopupBigWindow>
        </ResponsiveContent>
      </PopupBackdrop>
    )
  }

  return (
    <PopupBackdrop>
      <ResponsiveContent>
        <PopupBigWindow>
          <Column uiTransform={{ width: '70%' }}>
            <CommunityViewHeader community={community} />
            <TabComponent
              uiTransform={{
                width: '90%',
                padding: {
                  left: fontSize * 2,
                  right: fontSize * 2,
                  top: fontSize
                },
                flexShrink: 0
              }}
              fontSize={fontSizeSmall}
              tabs={COMMUNITY_TABS.map((t, i) => ({
                ...t,
                active: activeTabIndex === i
              }))}
              onClickTab={setActiveTabIndex}
            />
            {/* Content */}
            <Column
              uiTransform={{
                width: '100%',
                flexGrow: 1,
                padding: {
                  left: fontSize * 2,
                  right: fontSize * 2,
                  top: fontSize
                },
                overflow: 'scroll',
                scrollVisible: 'vertical'
              }}
            >
              {activeTabIndex === 0 && (
                <CommunityAnnouncements
                  communityId={community.id}
                  viewerRole={community.role}
                />
              )}
              {activeTabIndex === 1 && (
                <CommunityMembers
                  communityId={community.id}
                  viewerRole={community.role}
                />
              )}
              {activeTabIndex === 2 && (
                <CommunityPlaces communityId={community.id} />
              )}
              {activeTabIndex === 3 && (
                <CommunityPhotos communityId={community.id} />
              )}
            </Column>
          </Column>
          <Column
            uiTransform={{ width: '30%' }}
            uiBackground={{
              color: COLOR.DARK_OPACITY_5
            }}
          >
            <CommunityUpcomingEvents communityId={community.id} />
          </Column>
        </PopupBigWindow>
      </ResponsiveContent>
    </PopupBackdrop>
  )
}
