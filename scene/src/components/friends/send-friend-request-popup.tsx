import ReactEcs, { Input, UiEntity } from '@dcl/react-ecs'
import { type Popup, setLastPopupSubmitting } from '../popup-stack'
import { PopupBackdrop } from '../popup-backdrop'
import { COLOR } from '../color-palette'
import { Column, Row } from '../layout'
import { AvatarCircle } from '../avatar-circle'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { PlayerNameComponent } from '../player-name-component'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../utils/ui-utils'
import { noop } from '../../utils/function-utils'
import { store } from '../../state/store'
import { closeLastPopupAction, pushPopupAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { BevyApi } from '../../bevy-api'
import { executeTask } from '@dcl/sdk/ecs'
import ButtonComponent from '../button-component'
import { fetchAndStoreFriendRequests } from './friend-request-list'
import { getNameWithHashPostfix } from '../../service/chat/chat-utils'
import useState = ReactEcs.useState

const MAX_MESSAGE_LENGTH = 140

export type SendFriendRequestData = {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl?: string
}

export const SendFriendRequestPopup: Popup = ({ shownPopup }) => {
  const data = shownPopup.data as SendFriendRequestData
  const [message, setMessage] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  const addressColor = data.hasClaimedName
    ? getAddressColor(data.address)
    : COLOR.TEXT_COLOR_LIGHT_GREY
  const displayName = data.hasClaimedName
    ? data.name
    : getNameWithHashPostfix(data.name, data.address)
  const avatarSize = fontSize * 4

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          width: getContentScaleRatio() * 1200,
          borderRadius: BORDER_RADIUS_F,
          padding: {
            top: fontSize * 4,
            bottom: fontSize * 4,
            left: fontSize * 4,
            right: fontSize * 4
          },
          alignItems: 'center'
        }}
        uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
        onMouseDown={noop}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize }
          }}
          uiText={{
            value: '<b>Send Friend Request To</b>',
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'top-left'
          }}
        />

        <Row
          uiTransform={{
            width: '100%',
            alignItems: 'center',
            margin: { bottom: fontSize }
          }}
        >
          <AvatarCircle
            imageSrc={data.profilePictureUrl}
            userId={data.address}
            circleColor={addressColor}
            uiTransform={{
              width: avatarSize,
              height: avatarSize,
              margin: { right: fontSize }
            }}
            isGuest={false}
          />
          <PlayerNameComponent
            name={data.name}
            address={data.address}
            hasClaimedName={data.hasClaimedName}
            fontSize={fontSize}
          />
        </Row>

        <Input
          uiTransform={{
            width: '100%',
            height: fontSize * 5,
            borderRadius: fontSize / 2,
            borderWidth: 1,
            borderColor: COLOR.WHITE_OPACITY_5,
            padding: { left: fontSize * 0.5, top: fontSize * 0.5 },
            margin: { bottom: fontSize * 0.3 }
          }}
          multiLine={true}
          uiBackground={{ color: COLOR.WHITE }}
          value={message}
          placeholder="Write an introduction message"
          placeholderColor={COLOR.TEXT_COLOR_GREY}
          fontSize={fontSize}
          color={COLOR.TEXT_COLOR}
          onChange={(value) => {
            if (value.length <= MAX_MESSAGE_LENGTH) {
              setMessage(value)
            }
          }}
        />

        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize }
          }}
          uiText={{
            value: `${message.length}/${MAX_MESSAGE_LENGTH}`,
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_GREY,
            textAlign: 'top-left'
          }}
        />

        <Row
          uiTransform={{
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <ButtonComponent
            variant="subtle"
            value="<b>CANCEL</b>"
            loading={submitting}
            uiTransform={{ minWidth: '50%' }}
            onMouseDown={() => {
              store.dispatch(closeLastPopupAction())
            }}
          />
          <ButtonComponent
            variant="primary"
            value="<b>SEND</b>"
            loading={submitting}
            uiTransform={{ minWidth: '50%' }}
            onMouseDown={() => {
              if (submitting) return
              setSubmitting(true)
              setLastPopupSubmitting(true)
              executeTask(async () => {
                try {
                  await BevyApi.social.sendFriendRequest(
                    data.address,
                    message.length > 0 ? message : undefined
                  )
                  fetchAndStoreFriendRequests().catch(console.error)
                  setLastPopupSubmitting(false)
                  store.dispatch(closeLastPopupAction())
                  store.dispatch(
                    pushPopupAction({
                      type: HUD_POPUP_TYPE.FRIENDSHIP_RESULT,
                      data: {
                        variant: 'sent',
                        address: data.address,
                        name: displayName,
                        hasClaimedName: data.hasClaimedName
                      }
                    })
                  )
                } catch (error) {
                  setSubmitting(false)
                  setLastPopupSubmitting(false)
                  throw error
                }
              })
            }}
          />
        </Row>
      </Column>
    </PopupBackdrop>
  )
}
