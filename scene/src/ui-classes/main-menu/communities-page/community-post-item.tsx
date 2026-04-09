import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { type CommunityPost } from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { AvatarCircle } from '../../../components/avatar-circle'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'

function formatPostDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ]
    return `${months[date.getMonth()]} ${date.getDate()}`
  } catch {
    return dateStr
  }
}

export function CommunityPostItem({
  post
}: {
  post: CommunityPost
  key: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const fontSizeCaption = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const avatarSize = fontSize * 2.5
  const date = formatPostDate(post.createdAt)

  return (
    <Column
      uiTransform={{
        width: '100%',
        padding: { top: fontSize * 0.5, bottom: fontSize * 0.5 },
        margin: { bottom: fontSize * 0.5 },
        borderWidth: 0,
        borderColor: COLOR.WHITE_OPACITY_1
      }}
    >
      {/* Author row */}
      <Row
        uiTransform={{
          width: '100%',
          alignItems: 'center',
          margin: { bottom: fontSize * 0.3 }
        }}
      >
        <AvatarCircle
          userId={post.authorAddress}
          circleColor={getAddressColor(post.authorAddress)}
          uiTransform={{
            width: avatarSize,
            height: avatarSize,
            margin: { right: fontSize * 0.5 }
          }}
          isGuest={false}
        />
        <Row
          uiBackground={{
            color: COLOR.DARK_OPACITY_2
          }}
        >
          <Column>
            <UiEntity
              uiText={{
                value: `<b>${post.authorName}</b>`,
                fontSize: fontSizeSmall,
                color: COLOR.TEXT_COLOR_WHITE
              }}
            />
            <UiEntity
              uiTransform={{ margin: { left: fontSize * 0.5 } }}
              uiText={{
                value: `· ${date}`,
                fontSize: fontSizeCaption,
                color: COLOR.TEXT_COLOR_GREY
              }}
            />
            {/* Content */}
            <UiEntity
              uiTransform={{
                width: '100%',
                margin: { left: avatarSize + fontSize * 0.5 }
              }}
              uiText={{
                value: post.content,
                fontSize: fontSizeCaption,
                color: COLOR.TEXT_COLOR_WHITE,
                textAlign: 'top-left',
                textWrap: 'wrap'
              }}
            />
          </Column>

          {/* Like count */}
          <UiEntity
            uiTransform={{
              flexGrow: 1,
              justifyContent: 'flex-end',
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <UiEntity
              uiText={{
                value: `${post.likesCount}`,
                fontSize: fontSizeCaption,
                color: COLOR.TEXT_COLOR_GREY,
                textAlign: 'middle-right'
              }}
            />
          </UiEntity>
        </Row>
      </Row>
    </Column>
  )
}
