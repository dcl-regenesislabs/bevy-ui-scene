import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { type CommunityMember } from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { executeTask } from '@dcl/sdk/ecs'
import { fetchCommunityMembers } from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import { AvatarCircle } from '../../../components/avatar-circle'
import { PlayerNameComponent } from '../../../components/player-name-component'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'
import Icon from '../../../components/icon/Icon'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

function roleBadgeLabel(role: string): string | null {
  if (role === 'owner') return 'Owner'
  if (role === 'moderator') return 'Moderator'
  return null
}

function CommunityMemberItem({
  member
}: {
  member: CommunityMember
  key: string
}): ReactElement {
  const fontSize = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const addressColor =
    member.hasClaimedName && member.memberAddress
      ? getAddressColor(member.memberAddress.toLowerCase())
      : COLOR.TEXT_COLOR_LIGHT_GREY
  const badge = roleBadgeLabel(member.role)
  const avatarSize = fontSize * 2.5

  return (
    <Row
      uiTransform={{
        width: '50%',
        height: fontSize * 4,
        alignItems: 'center',
        padding: { left: fontSize, right: fontSize * 2 },
        margin: fontSize / 4,
        borderRadius: fontSize / 2
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_5
      }}
    >
      {/* Avatar */}
      <AvatarCircle
        imageSrc={member.profilePictureUrl}
        userId={member.memberAddress}
        circleColor={addressColor}
        uiTransform={{
          width: avatarSize,
          height: avatarSize,
          flexShrink: 0
        }}
        isGuest={false}
      />

      {/* Name + role badge */}
      <Column
        uiTransform={{
          justifyContent: 'center',
          margin: { left: fontSize * 0.3 }
        }}
      >
        <PlayerNameComponent
          name={member.name}
          address={member.memberAddress}
          hasClaimedName={member.hasClaimedName}
          fontSize={fontSize}
        />
        {badge != null && (
          <UiEntity
            uiTransform={{
              borderRadius: fontSizeSmall / 2,
              alignSelf: 'flex-start',
              position: { top: -fontSizeSmall * 0.3, left: fontSizeSmall },
              padding: -fontSizeSmall / 4
            }}
            uiBackground={{ color: COLOR.WHITE_OPACITY_1 }}
            uiText={{
              value: badge,
              fontSize: fontSizeSmall,
              color: COLOR.WHITE
            }}
          />
        )}
      </Column>

      {/* Spacer */}
      <UiEntity uiTransform={{ flexGrow: 1 }} />

      {/* Action button */}
      <UiEntity
        uiTransform={{
          borderRadius: fontSize / 2,
          height: fontSize * 2,
          padding: {
            left: fontSize * 0.5,
            right: fontSize * 0.6
          },
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row'
        }}
        uiBackground={{ color: COLOR.BUTTON_PRIMARY }}
      >
        <Icon
          icon={{ spriteName: 'Add', atlasName: 'context' }}
          iconSize={fontSize}
          iconColor={COLOR.WHITE}
        />
        <UiEntity
          uiText={{
            value: '<b>ADD FRIEND</b>',
            fontSize: fontSizeSmall,
            color: COLOR.WHITE,
            textWrap: 'nowrap'
          }}
        />
      </UiEntity>
    </Row>
  )
}

/** Chunk an array into groups of `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export function CommunityMembers({
  communityId
}: {
  communityId: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const scale = getContentScaleRatio()
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      try {
        const result = await fetchCommunityMembers(communityId, { limit: 50 })
        setMembers(result.results ?? [])
      } catch (error) {
        console.error('[communities] failed to load members', error)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <Column uiTransform={{ width: '100%' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Row
            key={i}
            uiTransform={{
              width: '100%',
              margin: { bottom: fontSize * 0.5 }
            }}
          >
            <UiEntity
              uiTransform={{
                width: '50%',
                height: scale * 70,
                padding: { right: fontSize * 0.3 }
              }}
            >
              <LoadingPlaceholder
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  borderRadius: fontSize / 2
                }}
              />
            </UiEntity>
            <UiEntity
              uiTransform={{
                width: '50%',
                height: scale * 70,
                padding: { left: fontSize * 0.3 }
              }}
            >
              <LoadingPlaceholder
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  borderRadius: fontSize / 2
                }}
              />
            </UiEntity>
          </Row>
        ))}
      </Column>
    )
  }

  if (members.length === 0) {
    return (
      <UiEntity
        uiText={{
          value: 'No members yet',
          fontSize,
          color: COLOR.TEXT_COLOR_GREY
        }}
      />
    )
  }

  const rows = chunk(members, 2)

  return (
    <Column uiTransform={{ width: '100%' }}>
      {rows.map((pair, rowIndex) => (
        <Row key={rowIndex} uiTransform={{ width: '100%' }}>
          {pair.map((member) => (
            <CommunityMemberItem key={member.memberAddress} member={member} />
          ))}
        </Row>
      ))}
    </Column>
  )
}
