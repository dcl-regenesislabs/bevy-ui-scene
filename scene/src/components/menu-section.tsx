import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type Children, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { Column } from './layout'
import { AlignContext, type Align } from '../service/align-context'

/**
 * Vertical stack of menu items with a shared alignment. Children that
 * read `useAlign()` (e.g. `<ButtonComponent>`) align themselves
 * accordingly without needing per-callsite props.
 *
 * ```tsx
 * <MenuSection align="left">
 *   <ViewPassportButton />
 *   <MentionButton />
 *   <BlockUserButton />
 * </MenuSection>
 * ```
 *
 * `align` defaults to `'left'` because that's the typical menu-list
 * orientation. Pass `'right'` for trailing menus or `'center'` to
 * disable the alignment behavior (matches the bare ButtonComponent
 * default).
 */
export function MenuSection({
  align = 'left',
  uiTransform,
  children
}: {
  align?: Align
  uiTransform?: UiTransformProps
  children?: Children
}): ReactElement {
  return (
    <AlignContext.Provider value={align}>
      <Column uiTransform={{ width: '100%', ...uiTransform }}>
        {children}
      </Column>
    </AlignContext.Provider>
  )
}
