import ReactEcs from '@dcl/react-ecs'

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
 */
export type Align = 'left' | 'center' | 'right'

export const AlignContext = ReactEcs.createContext<Align>('center')

export const useAlign = (): Align => ReactEcs.useContext(AlignContext)
