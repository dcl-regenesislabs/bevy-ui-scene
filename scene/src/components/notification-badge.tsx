import ReactEcs, {
  Label,
  type ReactElement,
  UiEntity,
  type UiTransformProps
} from '@dcl/react-ecs'
import { COLOR } from './color-palette'
import { ROUNDED_TEXTURE_BACKGROUND } from '../utils/constants'
import {
  type CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../service/fontsize-system'
import { useLayoutContext } from '../service/layout-context'

/**
 * Small red pill that shows an unread/notification count. Renders nothing
 * when `count <= 0`. Adapts its font size to the layout context (SIDE /
 * DIALOG); pass `context` to override.
 *
 * Defaults to absolute positioning anchored to the bottom-right of its
 * parent (the canonical "badge on a button" placement). Override via
 * `uiTransform`.
 */
export function NotificationBadge({
  count,
  context,
  uiTransform
}: {
  count: number
  context?: CONTEXT
  uiTransform?: UiTransformProps
}): ReactElement | null {
  const fromContext = useLayoutContext()
  if (count <= 0) return null
  const ctx = context ?? fromContext
  const fontSize = getFontSize({
    context: ctx,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { bottom: '-5%', right: '-5%' },
        width: '40%',
        height: '40%',
        flexDirection: 'row',
        alignItems: 'center',
        ...uiTransform
      }}
      uiBackground={{
        ...ROUNDED_TEXTURE_BACKGROUND,
        color: COLOR.BADGE_BG
      }}
    >
      <Label
        value={count.toString()}
        textAlign="middle-center"
        fontSize={fontSize}
        textWrap="nowrap"
        uiTransform={{ width: '100%', height: '100%' }}
      />
    </UiEntity>
  )
}
