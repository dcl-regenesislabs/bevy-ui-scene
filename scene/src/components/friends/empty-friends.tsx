import ReactEcs from '@dcl/react-ecs'
import { UiEntity } from '@dcl/sdk/react-ecs'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import { COLOR } from '../color-palette'
import Icon from '../icon/Icon'
import { Column } from '../layout'

export function EmptyFriends(): ReactEcs.JSX.Element {
  const fontSize = getFontSize({})
  const fontSize_title = getFontSize({ token: TYPOGRAPHY_TOKENS.TITLE_M })
  const iconSize = fontSize * 5

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
          margin: { bottom: 16 },
          borderRadius: fontSize,
          borderWidth: fontSize / 7,
          borderColor: COLOR.WHITE
        }}
      >
        <Icon
          icon={{ spriteName: 'Friends on', atlasName: 'navbar' }}
          iconSize={iconSize}
          iconColor={COLOR.WHITE_OPACITY_5}
        />
      </UiEntity>
      <UiEntity
        uiText={{
          value: 'Time To Make Some Friends!',
          fontSize: fontSize_title,
          color: COLOR.TEXT_COLOR_WHITE
        }}
        uiTransform={{ margin: { bottom: 8 } }}
      />
      <UiEntity
        uiText={{
          value:
            "View someone's Profile or click on their name\nin the Chat to see the '<b>Add Friend</b>' option.",
          fontSize: fontSize,
          color: COLOR.TEXT_COLOR_GREY,
          textAlign: 'middle-center'
        }}
      />
    </Column>
  )
}
