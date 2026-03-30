import ReactEcs from '@dcl/react-ecs'
import { UiEntity } from '@dcl/sdk/react-ecs'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import { Column } from '../layout'

export function EmptyBlocked(): ReactEcs.JSX.Element {
  const fontSize = getFontSize({ context: CONTEXT.SIDE })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.SIDE,
    token: TYPOGRAPHY_TOKENS.TITLE_M
  })
  const iconSize = fontSize * 2

  return (
    <Column
      uiTransform={{
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <UiEntity
        uiTransform={{
          width: iconSize,
          height: iconSize,
          justifyContent: 'center',
          alignItems: 'center',
          margin: { bottom: fontSize },
          borderRadius: fontSize,
          borderWidth: fontSize / 7,
          borderColor: COLOR.WHITE,
          padding: fontSize * 2
        }}
      >
        <Icon
          icon={{ spriteName: 'BlockUser', atlasName: 'icons' }}
          iconSize={iconSize}
          iconColor={COLOR.WHITE}
        />
      </UiEntity>
      <UiEntity
        uiText={{
          value: 'No Blocked Accounts',
          fontSize: fontSizeTitle,
          color: COLOR.TEXT_COLOR_WHITE
        }}
        uiTransform={{ margin: { bottom: fontSize * 0.5 } }}
      />
      <UiEntity
        uiText={{
          value:
            "If you block someone, you will not be able to see each other in-world or exchange messages. You will also not see each other's names or messages in public chats.\nThe option to block an account is available in the menu on their Profile or when you click on their name in the Chat.",
          fontSize,
          color: COLOR.TEXT_COLOR_GREY,
          textAlign: 'middle-center',
          textWrap: 'wrap'
        }}
      />
    </Column>
  )
}
