import ReactEcs, { ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../color-palette'
import { getFontSize } from '../../service/fontsize-system'
import { getChatMaxHeight } from '../chat/chat-area'
import { NavItem } from '../nav-button/NavButton'
import { Tab, TabComponent } from '../tab-component'
import { store } from '../../state/store'
import { updateHudStateAction } from '../../state/hud/actions'
const FRIENDS_TAB: Tab[] = [
  { text: '  FRIENDS ' },
  { text: '  REQUESTS  ' },
  { text: '  BLOCKED  ' }
]

export default function FriendsPanel(): ReactElement {
  const fontSize = getFontSize({})
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: getChatMaxHeight() * 1.1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        alignSelf: 'space-around',
        flexDirection: 'column',
        borderRadius: fontSize / 2,
        borderColor: COLOR.RED,
        borderWidth: 1,
        opacity: 1,
        margin: { bottom: fontSize }
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
    </UiEntity>
  )
}
