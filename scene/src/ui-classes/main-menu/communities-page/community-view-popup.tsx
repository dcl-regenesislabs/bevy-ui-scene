import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { ResponsiveContent } from '../backpack-page/BackpackPage'
import { Column } from '../../../components/layout'
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
import { CommunityViewHeader } from './community-view-header'
import { PopupBigWindow } from '../../../components/popup-big-window'
import { type Tab, TabComponent } from '../../../components/tab-component'
import useState = ReactEcs.useState

export const CommunityViewPopup: Popup = ({ shownPopup }) => {
  const community = shownPopup.data as CommunityListItem
  if (community == null) return null
  return <CommunityViewContent community={community} />
}

function CommunityViewContent({
  community
}: {
  community: CommunityListItem
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0)

  const COMMUNITY_TABS: Tab[] = [
    { text: '  ANNOUNCEMENTS  ' },
    { text: '  MEMBERS  ' },
    { text: '  PLACES  ' },
    { text: '  PHOTOS  ' }
  ]

  return (
    <PopupBackdrop>
      <ResponsiveContent>
        <PopupBigWindow>
          <Column uiTransform={{ width: '80%' }}>
            <CommunityViewHeader community={community} />
            <TabComponent
              uiTransform={{
                width: '100%',
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
                <CommunityAnnouncements communityId={community.id} />
              )}
              {activeTabIndex === 1 && (
                <CommunityMembers communityId={community.id} />
              )}
              {activeTabIndex === 2 && (
                <CommunityPlaces communityId={community.id} />
              )}
              {activeTabIndex === 3 && (
                <CommunityPhotos communityId={community.id} />
              )}
            </Column>
          </Column>
          <Column uiTransform={{ width: '20%' }}></Column>
        </PopupBigWindow>
      </ResponsiveContent>
    </PopupBackdrop>
  )
}
