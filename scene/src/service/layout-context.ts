import { createContext, useContext } from 'react'
import { CONTEXT } from './fontsize-system'

/**
 * Project-level layout context. Components inside a `<LayoutContext.Provider
 * value={CONTEXT.SIDE | CONTEXT.DIALOG}>` adapt their fontSize / spacing /
 * radius to that context without prop drilling.
 *
 * Default is `CONTEXT.SIDE`: any component outside a Provider behaves as if
 * it were rendered in a sidebar/HUD context. Popups should wrap their
 * content in `<LayoutContext.Provider value={CONTEXT.DIALOG}>`.
 *
 * Components that already accept an explicit `layoutContext` prop (e.g.
 * `ButtonIcon`, `ButtonTextIcon`) should treat the prop as an override:
 * `props.layoutContext ?? useLayoutContext()`.
 *
 * Imports come straight from `react` because `@dcl/react-ecs` doesn't
 * expose the Context API yet (pending upstream PR). `react` itself is a
 * transitive dependency that lives in `node_modules/react`. See
 * `scene/src/types/react.d.ts` for the typing shim.
 */
export const LayoutContext = createContext<CONTEXT>(CONTEXT.SIDE)

export const useLayoutContext = (): CONTEXT => useContext(LayoutContext)
