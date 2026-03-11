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

const FRIENDS_TAB: Tab[] = [
  { text: '  FRIENDS ' },
  { text: '  REQUESTS  ' },
  { text: '  BLOCKED  ' }
]

export default function FriendsPanel(): ReactElement {
  const fontSize = getFontSize({})
  const [friends, setFriends] = useState<Friend[]>(getFriends())
  const [hoveredFriend, setHoveredFriend] = useState<Friend | null>(null)
  const [isOnlineExpanded, setIsOnlineExpanded] = useState<boolean>(true)
  const [isOfflineExpanded, setIsOfflineExpanded] = useState<boolean>(true)
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
      <Column
        uiTransform={{
          scrollVisible: 'vertical',
          overflow: 'scroll',
          width: '100%',
          height: getChatMaxHeight() * 1.05
        }}
      >
        <PanelSectionHeader
          topBorder={false}
          onMouseDown={() => {
            setIsOnlineExpanded(!isOnlineExpanded)
          }}
        >
          <Icon
            icon={{
              spriteName: isOnlineExpanded ? 'UpArrow' : 'DownArrow',
              atlasName: 'icons'
            }}
            iconSize={fontSize}
          />
          <UiEntity uiText={{ value: 'ONLINE', fontSize }} />
        </PanelSectionHeader>
        {isOnlineExpanded ? (
          <Column uiTransform={{ width: '100%' }}>
            {friends
              .filter(
                (f) =>
                  f.onlineStatus === ONLINE_STATUS.IDLE ||
                  f.onlineStatus === ONLINE_STATUS.ONLINE
              )
              .sort((a: Friend, b: Friend) => {
                return a.onlineStatus < b.onlineStatus ? 1 : -1
              })
              .map((friend) => {
                return (
                  <FriendPanelItem
                    friend={friend}
                    hovered={friend === hoveredFriend}
                    onMouseEnter={() => {
                      setHoveredFriend(friend)
                    }}
                    onMouseLeave={() => {
                      if (friend === hoveredFriend) {
                        setHoveredFriend(null)
                      }
                    }}
                  />
                )
              })}
          </Column>
        ) : null}
        <PanelSectionHeader
          onMouseDown={() => {
            setIsOfflineExpanded(!isOfflineExpanded)
          }}
        >
          <Icon
            icon={{
              spriteName: isOfflineExpanded ? 'UpArrow' : 'DownArrow',
              atlasName: 'icons'
            }}
            iconSize={fontSize}
          />
          <UiEntity uiText={{ value: 'OFFLINE', fontSize }} />
        </PanelSectionHeader>
        {isOfflineExpanded ? (
          <Column
            uiTransform={{
              width: '100%'
            }}
          >
            {friends
              .filter((f) => f.onlineStatus === ONLINE_STATUS.OFFLINE)
              .map((friend) => {
                return (
                  <FriendPanelItem
                    friend={friend}
                    hovered={friend === hoveredFriend}
                    onMouseEnter={() => {
                      setHoveredFriend(friend)
                    }}
                    onMouseLeave={() => {
                      if (friend === hoveredFriend) {
                        setHoveredFriend(null)
                      }
                    }}
                  />
                )
              })}
          </Column>
        ) : null}
      </Column>
    </Column>
  )
}

export function PanelSectionHeader({
  children,
  topBorder = true,
  onMouseDown = noop
}: {
  children?: ReactElement
  topBorder?: boolean
  onMouseDown?: () => void
}): ReactElement {
  const fontSize = getFontSize({})
  return (
    <Row
      onMouseDown={onMouseDown}
      uiTransform={{
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}
    >
      {topBorder && (
        <TopBorder color={COLOR.WHITE_OPACITY_1} uiTransform={{ height: 1 }} />
      )}
      <Row
        uiTransform={{
          padding: { left: fontSize / 2 },
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}
      >
        {children}
      </Row>
      <BottomBorder color={COLOR.WHITE_OPACITY_1} uiTransform={{ height: 1 }} />
    </Row>
  )
}
