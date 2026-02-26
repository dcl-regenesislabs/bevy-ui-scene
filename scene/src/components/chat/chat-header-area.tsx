import ReactEcs, { ReactElement, UiEntity, Label } from '@dcl/react-ecs'
import { getFontSize } from '../../service/fontsize-system'
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import { ThinMenuButton } from '../thin-menu-button'
import { store } from '../../state/store'
import { getChatMembers } from '../../service/chat-members'
import { Checkbox } from '../checkbox'
import { MESSAGE_TYPE } from './chat-message/ChatMessage.types'
import { scrollToBottom } from 'src/ui-classes/main-hud/chat-and-logs/ChatsAndLogs'
import { updateHudStateAction } from '../../state/hud/actions'
import { CloseButton } from '../close-button'

export function ChatHeaderArea({ state }: { state: any }): ReactElement {
  const fontSize = getFontSize({})

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '-5%' },
        width: '100%',
        height: '4%',
        padding: { top: '4%', bottom: 0, left: 0, right: fontSize / 4 },
        justifyContent: 'flex-start',
        flexShrink: 0,
        alignItems: 'center',
        borderRadius: fontSize / 2,
        borderColor: COLOR.BLACK_TRANSPARENT,
        borderWidth: 0,
        zIndex: 2
      }}
      uiBackground={{
        color: COLOR.TEXT_COLOR
      }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          position: { top: '70%' },
          zIndex: 2
        }}
        uiBackground={{
          color: COLOR.TEXT_COLOR
        }}
      />
      <Icon
        uiTransform={{ margin: { left: '4%' }, zIndex: 3, flexShrink: 0 }}
        iconSize={fontSize * 1.5}
        icon={{ spriteName: 'DdlIconColor', atlasName: 'icons' }}
      />
      <Label
        uiTransform={{
          zIndex: 3,
          width: '100%'
        }}
        textAlign={'top-left'}
        value={'Nearby'}
        fontSize={fontSize}
        color={COLOR.INACTIVE}
      />
      <UiEntity
        uiTransform={{
          alignSelf: 'flex-end',
          width: '60%',
          height: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          zIndex: 3
        }}
      >
        <Icon
          iconSize={fontSize}
          icon={{ spriteName: 'Members', atlasName: 'icons' }}
        />
        <Label
          uiTransform={{ position: { left: '-4%' } }}
          value={getChatMembers().length.toString()}
          fontSize={fontSize}
        />
      </UiEntity>

      <UiEntity
        uiTransform={{
          alignSelf: 'center',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          zIndex: 2,
          width: fontSize * 2,
          height: fontSize * 2,
          flexShrink: 0,
          margin: { right: '2%' }
        }}
        uiBackground={{ color: COLOR.TEXT_COLOR }}
      >
        <ThinMenuButton
          uiTransform={{
            height: '100%',
            alignSelf: 'flex-end'
          }}
          onMouseDown={() => {
            state.headerMenuOpen = !state.headerMenuOpen

            if (state.headerMenuOpen) {
              state.chatBox.size.x =
                store.getState().viewport.width * 0.26 +
                (state.headerMenuOpen
                  ? store.getState().viewport.width * 0.12
                  : 0)
            }
          }}
        />

        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: '250%', top: 0 },
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            alignContent: 'flex-start',
            alignSelf: 'flex-start',
            padding: '10%',
            opacity: state.headerMenuOpen ? 1 : 0
          }}
          uiBackground={{
            color: state.headerMenuOpen
              ? COLOR.DARK_OPACITY_5
              : COLOR.BLACK_TRANSPARENT
          }}
        >
          <Checkbox
            uiTransform={{
              alignSelf: 'flex-start'
            }}
            onChange={(value) => {
              state.filterMessages[MESSAGE_TYPE.USER] = !value
              scrollToBottom()
            }}
            value={!state.filterMessages[MESSAGE_TYPE.USER]}
            label={'Show user messages'}
          />
          <Checkbox
            uiTransform={{
              alignSelf: 'flex-start'
            }}
            onChange={(value) => {
              state.filterMessages[MESSAGE_TYPE.SYSTEM] = !value
              scrollToBottom() // TODO this shouldn't be necessary, wrapper component should listen filter change, and scroll to bottom on any change
            }}
            value={!state.filterMessages[MESSAGE_TYPE.SYSTEM]}
            label={'Show engine messages'}
          />
          <Checkbox
            uiTransform={{
              alignSelf: 'flex-start'
            }}
            onChange={(value) => {
              state.filterMessages[MESSAGE_TYPE.SYSTEM_FEEDBACK] = !value
              scrollToBottom()
            }}
            value={!state.filterMessages[MESSAGE_TYPE.SYSTEM_FEEDBACK]}
            label={'Show system messages'}
          />
        </UiEntity>
      </UiEntity>
      <CloseButton
        uiTransform={{
          zIndex: 2
        }}
        onClick={() => {
          store.dispatch(
            updateHudStateAction({ chatOpen: !store.getState().hud.chatOpen })
          )
        }}
      />
    </UiEntity>
  )
}
