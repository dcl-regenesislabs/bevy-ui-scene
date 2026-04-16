import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Row } from '../../../components/layout'
import { COLOR } from '../../../components/color-palette'
import Icon from '../../../components/icon/Icon'
import type { CommunityPrivacy } from '../../../service/communities-types'
import type { UiTransformProps } from '@dcl/sdk/react-ecs'

function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return String(count)
}

export function CommunityPublicAndMembersSpan({
  privacy,
  membersCount,
  fontSize,
  uiTransform
}: {
  privacy: CommunityPrivacy
  membersCount: number
  fontSize: number
  uiTransform?: UiTransformProps
}): ReactElement {
  const privacyLabel = privacy === 'public' ? 'Public' : 'Private'
  return (
    <Row uiTransform={uiTransform}>
      <Icon
        icon={{
          spriteName: privacy === 'public' ? 'PublicIcn' : 'PrivateIcn',
          atlasName: 'icons'
        }}
        iconSize={fontSize}
      />
      <UiEntity
        uiTransform={{ padding: { right: -fontSize } }}
        uiText={{
          value: `${privacyLabel} | `,
          fontSize,
          color: COLOR.TEXT_COLOR_LIGHT_GREY,
          textAlign: 'top-left'
        }}
      />
      <UiEntity
        uiText={{
          value: `${formatMemberCount(membersCount)} Members`,
          fontSize,
          color: COLOR.WHITE,
          textAlign: 'top-left'
        }}
      />
    </Row>
  )
}
