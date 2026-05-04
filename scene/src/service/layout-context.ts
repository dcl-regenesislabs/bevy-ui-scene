import ReactEcs from '@dcl/react-ecs'
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
 */
export const LayoutContext = ReactEcs.createContext<CONTEXT>(CONTEXT.SIDE)

export const useLayoutContext = (): CONTEXT =>
  ReactEcs.useContext(LayoutContext)
