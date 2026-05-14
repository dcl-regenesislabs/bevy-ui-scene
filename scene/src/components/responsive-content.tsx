import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentHeight, getContentWidth } from '../service/canvas-ratio'
import { LayoutContext } from '../service/layout-context'
import { CONTEXT } from '../service/fontsize-system'

/**
 * Canonical "big content area" wrapper used by popups (passport,
 * community-view) and main-menu pages (backpack, settings, communities,
 * permissions form).
 *
 * Two responsibilities:
 *   - Sizes itself to the responsive content area
 *     (`getContentWidth() x getContentHeight() * 1.1`).
 *   - Provides `LayoutContext = CONTEXT.DIALOG` so descendants reading
 *     `useLayoutContext()` (e.g. `FriendButton`, `ButtonComponent`) get
 *     dialog-sized typography automatically. All current consumers are
 *     dialog-context, so this is the right default.
 */
export function ResponsiveContent({
  children
}: {
  children?: ReactElement
}): ReactElement {
  return (
    <LayoutContext.Provider value={CONTEXT.DIALOG}>
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: getContentWidth(),
          height: getContentHeight() * 1.1
        }}
      >
        {children}
      </UiEntity>
    </LayoutContext.Provider>
  )
}
