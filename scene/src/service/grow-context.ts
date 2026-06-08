import { createContext, useContext } from 'react'

/**
 * Generic "make me grow" context. A flex container wrapped in
 * `<GrowContext.Provider value={{ active: true, gap }}>` (typically via
 * `<Row childrenGrow childrenGap={…}>`) signals its descendants to
 * self-apply `flexGrow: 1` + `flexBasis: 0` and a symmetric `gap/2`
 * horizontal margin, so the container's children split available space
 * evenly without each callsite having to specify `uiTransform`.
 *
 * Components that participate (currently `ButtonComponent`) read this
 * via `useGrowContext()` and merge the inferred transform underneath the
 * caller's `props.uiTransform`, so explicit overrides still win.
 *
 * Default `{ active: false, gap: 0 }` is a no-op — anything outside a
 * provider renders exactly as it did before this context existed.
 *
 * Imports come straight from `react` because `@dcl/react-ecs` doesn't
 * expose the Context API yet (pending upstream PR). See
 * `scene/src/types/react.d.ts` for the typing shim.
 */
export type GrowContextValue = {
  active: boolean
  /** Total horizontal space between two adjacent children, in px. */
  gap: number
}

export const GrowContext = createContext<GrowContextValue>({
  active: false,
  gap: 0
})

export const useGrowContext = (): GrowContextValue => useContext(GrowContext)
