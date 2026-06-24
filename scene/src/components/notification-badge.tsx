import ReactEcs, {
  Label,
  type ReactElement,
  UiEntity,
  type UiTransformProps
} from '@dcl/react-ecs'
import { type Color4 } from '@dcl/sdk/math'
import { COLOR } from './color-palette'
import { ROUNDED_TEXTURE_BACKGROUND } from '../utils/constants'
import {
  type CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../service/fontsize-system'
import { useLayoutContext } from '../service/layout-context'

/**
 * Small pill that shows an unread/notification count. Renders nothing when
 * `count <= 0`. Adapts its font size to the layout context (SIDE / DIALOG);
 * pass `context` to override.
 *
 * Two layouts:
 * - default (`inline` off): absolute, anchored to the bottom-right of its
 *   parent — the canonical "badge on a button" placement (notifications bell,
 *   chat-unread).
 * - `inline`: a relative pill that sizes to its content, for placing next to a
 *   label in a row.
 *
 * `color` overrides the background (default red `COLOR.BADGE_BG`). `maxCount`
 * caps the displayed number — above it the badge shows `+{maxCount}` (mirrors
 * unity's `NotificationIndicatorView`, which caps at `+9`).
 */
export function NotificationBadge({
  count,
  context,
  uiTransform,
  color,
  maxCount,
  inline = false
}: {
  count: number
  context?: CONTEXT
  uiTransform?: UiTransformProps
  color?: Color4
  maxCount?: number
  inline?: boolean
}): ReactElement | null {
  const fromContext = useLayoutContext()
  if (count <= 0) return null
  const ctx = context ?? fromContext
  const fontSize = getFontSize({
    context: ctx,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  const label =
    maxCount != null && count > maxCount ? `+${maxCount}` : `${count}`

  const layout: UiTransformProps = inline
    ? {
        positionType: 'relative',
        height: fontSize * 1.5,
        minWidth: fontSize * 1.5,
        width: 'auto',
        padding: { left: fontSize * 0.4, right: fontSize * 0.4 },
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
      }
    : {
        positionType: 'absolute',
        position: { bottom: '-5%', right: '-5%' },
        width: '40%',
        height: '40%',
        flexDirection: 'row',
        alignItems: 'center'
      }

  return (
    <UiEntity
      uiTransform={{ ...layout, ...uiTransform }}
      uiBackground={{
        ...ROUNDED_TEXTURE_BACKGROUND,
        color: color ?? COLOR.BADGE_BG
      }}
    >
      <Label
        value={label}
        textAlign="middle-center"
        fontSize={fontSize}
        textWrap="nowrap"
        uiTransform={
          inline ? { height: '100%' } : { width: '100%', height: '100%' }
        }
      />
    </UiEntity>
  )
}
