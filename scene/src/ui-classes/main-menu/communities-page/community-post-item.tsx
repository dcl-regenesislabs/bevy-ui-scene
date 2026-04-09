import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { type CommunityPost } from '../../../service/communities-types'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import { AvatarCircle } from '../../../components/avatar-circle'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'
import { PlayerNameComponent } from '../../../components/player-name-component'

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
  const avatarSize = fontSize * 2.5
  const date = formatPostDate(post.createdAt)

  return (
    <Row
      uiTransform={{
        width: '100%',
        margin: { bottom: fontSize * 0.3 },
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
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
        uiTransform={{
          borderRadius: fontSize / 2,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: fontSize
        }}
        uiBackground={{
          color: COLOR.DARK_OPACITY_5
        }}
      >
        <Column
          uiTransform={{
            alignItems: 'flex-start',
            flexGrow: 1
          }}
        >
          <Row uiTransform={{ alignItems: 'center' }}>
            <PlayerNameComponent
              name={post.authorName}
              address={post.authorAddress}
              hasClaimedName={post.authorHasClaimedName}
              fontSize={fontSize}
            />
            <UiEntity
              uiTransform={{ margin: { left: fontSize * 0.5 } }}
              uiText={{
                value: `· ${date}`,
                fontSize,
                color: COLOR.TEXT_COLOR_GREY
              }}
            />
          </Row>

          <UiEntity
            uiTransform={{
              width: '100%'
            }}
            uiText={{
              value: post.content,
              fontSize: fontSize,
              color: COLOR.TEXT_COLOR_WHITE,
              textAlign: 'top-left',
              textWrap: 'wrap'
            }}
          />
        </Column>

        {/* Like count */}
        <UiEntity
          uiText={{
            value: `${post.likesCount}`,
            fontSize: fontSize,
            color: COLOR.TEXT_COLOR_GREY,
            textAlign: 'middle-right'
          }}
        />
      </Row>
    </Row>
  )
}
