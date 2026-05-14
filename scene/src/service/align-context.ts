import { createContext, useContext } from 'react'

/**
 * Generic alignment context. A subtree wrapped in
 * `<AlignContext.Provider value="left">` (or via `<MenuSection align="left">`)
 * lets descendant primitives read the intended alignment without prop
 * drilling. Components map this to the right Yoga property — typically
 * `justifyContent` on flex containers:
 *
 *   - `'left'`   → `'flex-start'`
 *   - `'center'` → `'center'`
 *   - `'right'`  → `'flex-end'`
 *
 * Default `'center'` keeps existing components rendering centered when
 * no Provider is in scope.
 *
 * Imports come straight from `react` because `@dcl/react-ecs` doesn't
 * expose the Context API yet (pending upstream PR). See
 * `scene/src/types/react.d.ts` for the typing shim.
 */
export type Align = 'left' | 'center' | 'right'

export const AlignContext = createContext<Align>('center')

export const useAlign = (): Align => useContext(AlignContext)
