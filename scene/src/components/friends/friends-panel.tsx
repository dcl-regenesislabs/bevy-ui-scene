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
import { AvatarCircle } from '../avatar-circle'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { getFriends } from './mock-friends-data'
import useState = ReactEcs.useState
import { ButtonIcon } from '../button-icon'

const FRIENDS_TAB: Tab[] = [
  { text: '  FRIENDS ' },
  { text: '  REQUESTS  ' },
  { text: '  BLOCKED  ' }
]

export default function FriendsPanel(): ReactElement {
  const fontSize = getFontSize({})
  const [friends, setFriends] = useState<Friend[]>(getFriends())
  const [hoveredFriend, setHoveredFriend] = useState<Friend | null>(null)

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
        margin: { bottom: fontSize },
        scrollVisible: 'vertical',
        overflow: 'scroll'
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_9 }}
    >
      <TabComponent
        uiTransform={{
          width: '100%',
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
      <PanelSectionHeader topBorder={false}>
        <Icon
          icon={{ spriteName: 'UpArrow', atlasName: 'icons' }}
          iconSize={fontSize}
        />
        <UiEntity uiText={{ value: 'ONLINE', fontSize }} />
      </PanelSectionHeader>
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
      <PanelSectionHeader>
        <Icon
          icon={{ spriteName: 'UpArrow', atlasName: 'icons' }}
          iconSize={fontSize}
        />
        <UiEntity uiText={{ value: 'OFFLINE', fontSize }} />
      </PanelSectionHeader>
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
    </Column>
  )
}

export function PanelSectionHeader({
  children,
  topBorder = true
}: {
  children?: ReactElement
  topBorder?: boolean
}): ReactElement {
  const fontSize = getFontSize({})
  return (
    <Row
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

export function FriendPanelItem({
  friend,
  onMouseEnter,
  onMouseLeave,
  hovered = false
}: {
  friend: Friend
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  hovered: boolean
}): ReactElement {
  const addressColor = getAddressColor(friend.address)
  const fontSize = getFontSize({})
  const menuButtonTransform = {
    width: fontSize * 1.5,
    height: fontSize * 1.5,
    margin: { right: fontSize / 2 }
  }
  const menuButtonIconSize = fontSize * 1.2
  return (
    <Row
      uiTransform={{
        width: '100%'
      }}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      uiBackground={{
        color: hovered ? COLOR.WHITE_OPACITY_1 : COLOR.BLACK_TRANSPARENT
      }}
    >
      <AvatarCircle
        userId={friend.address}
        circleColor={addressColor}
        uiTransform={{
          margin: { left: fontSize },
          width: fontSize * 2,
          height: fontSize * 2
        }}
        isGuest={false}
      />
      <Column
        uiTransform={{
          alignItems: 'flex-start',
          justifyContent: 'center'
        }}
      >
        <Row>
          <UiEntity
            uiText={{
              value: `<b>${friend.name}</b>`,
              textAlign: 'middle-left',
              color: addressColor,
              fontSize
            }}
          />
          {friend.hasClaimedName ? (
            <Icon
              icon={{ spriteName: 'Verified', atlasName: 'icons' }}
              iconSize={fontSize}
            />
          ) : null}
        </Row>
        <UiEntity
          uiTransform={{
            margin: { top: -fontSize / 2 }
          }}
          uiText={{
            value: friend.onlineStatus,
            textAlign: 'middle-left',
            fontSize: getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })
          }}
        />
      </Column>
      <Column
        uiTransform={{
          justifyContent: 'flex-end',
          margin: { right: fontSize },
          flexGrow: 1
        }}
      >
        <Row
          uiTransform={{
            width: '100%',
            justifyContent: 'flex-end',
            alignItems: 'flex-end'
          }}
        >
          <ButtonIcon
            iconSize={menuButtonIconSize}
            icon={{ spriteName: 'Chat', atlasName: 'context' }}
            uiTransform={{
              ...menuButtonTransform
            }}
          />
          <ButtonIcon
            icon={{ spriteName: 'JumpIn', atlasName: 'icons' }}
            iconSize={menuButtonIconSize}
            uiTransform={{
              ...menuButtonTransform
            }}
          />
          <ButtonIcon
            iconSize={menuButtonIconSize}
            icon={{ spriteName: 'Menu', atlasName: 'icons' }}
            uiTransform={{
              ...menuButtonTransform
            }}
          />
        </Row>
      </Column>
    </Row>
  )
}
