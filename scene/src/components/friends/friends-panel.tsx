import ReactEcs, { ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../color-palette'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import { getChatMaxHeight } from '../chat/chat-area'
import { Tab, TabComponent } from '../tab-component'
import { store } from '../../state/store'
import { updateHudStateAction } from '../../state/hud/actions'
import Icon from '../icon/Icon'
import { Column, Row } from '../layout'
import { BottomBorder, TopBorder } from '../bottom-border'
import { Friend, ONLINE_STATUS } from '../../service/social-service-type'
import { getFriends } from './mock-friends-data'
import useState = ReactEcs.useState
import { noop } from '../../utils/function-utils'
import { FriendPanelItem } from './friend-panel-item'
import { PanelSectionHeader } from './panel-section-header'
import { FriendListPanel } from './friend-list-panel'

const FRIENDS_TAB: Tab[] = [
  { text: '  FRIENDS ' },
  { text: '  REQUESTS  ' },
  { text: '  BLOCKED  ' }
]

export default function FriendsPanel(): ReactElement {
  const fontSize = getFontSize({})

  return (
    <Column
      uiTransform={{
        width: '100%',
        height: getChatMaxHeight() * 1.1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        alignSelf: 'space-around',
        flexDirection: 'column',
        opacity: 1,
        margin: { bottom: fontSize }
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_9 }}
    >
      <TabComponent
        uiTransform={{
          width: '97%',
          height: fontSize * 2,
          borderRadius: { topLeft: fontSize / 2, topRight: fontSize / 2 },
          padding: { left: fontSize / 2 },
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}
        fontSize={fontSize}
        uiBackground={{ color: COLOR.BLACK_POPUP_BACKGROUND }}
        tabs={FRIENDS_TAB.map((t, tabIndex) => ({
          ...t,
          active: store.getState().hud.friendsActiveTabIndex === tabIndex
        }))}
        onClickTab={(tabIndex) => {
          store.dispatch(
            updateHudStateAction({
              friendsActiveTabIndex: tabIndex
            })
          )
        }}
      ></TabComponent>
      {store.getState().hud.friendsActiveTabIndex === 0 ? (
        <FriendListPanel />
      ) : null}
    </Column>
  )
}
