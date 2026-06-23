// TODO https://github.com/decentraland/bevy-explorer/issues/889 this file probably can be deleted

// Single source of truth for which dropdown (by id) is currently open. Only one
// can be open at a time. This is a small external store: callers subscribe and
// are notified when the open dropdown changes, so subscribed components
// re-render only on actual changes (the idiomatic React pattern, hand-rolled
// since React-ECS has no useSyncExternalStore).
//
// Used so that (a) opening a dropdown closes any other open one, (b) clicking
// elsewhere can dismiss the open dropdown, and (c) the global ESC ('Cancel')
// handler in MainHud yields precedence to an open dropdown via isAnyDropdownOpen.

let openId: number | null = null
let idCounter = 0
const listeners = new Set<() => void>()

const notify = (): void => {
  Array.from(listeners).forEach((listener) => {
    listener()
  })
}

// Subscribe to open-state changes; returns an unsubscribe fn.
export const subscribeDropdown = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Stable per-instance id for a dropdown (call once via a useState initializer).
export const createDropdownId = (): number => ++idCounter

export const isDropdownOpen = (id: number): boolean => openId === id

export const isAnyDropdownOpen = (): boolean => openId !== null

// Close whatever dropdown is open (no-op if none). Use on non-dropdown elements
// that should dismiss the open dropdown when clicked.
export const closeOpenDropdown = (): void => {
  if (openId === null) return
  openId = null
  notify()
}

// Toggle dropdown `id` (opening it closes any other open one; clicking the
// already-open one closes it), then run `handler`. Use on a dropdown field's
// onMouseDown, e.g. onMouseDown={() => wrapDropdownHandlerWorkaround(id, noop)}.
//
// Pass `id = null` to just close whatever dropdown is open before running the
// handler — for non-dropdown elements (e.g. a button) that should dismiss any
// open dropdown: onMouseDown={() => wrapDropdownHandlerWorkaround(null, onClick)}.
// TODO https://github.com/decentraland/bevy-explorer/issues/889
export const wrapDropdownHandlerWorkaround = (
  id: number | null,
  handler?: () => void
): void => {
  if (id === null) {
    closeOpenDropdown()
  } else {
    openId = openId === id ? null : id
    notify()
  }
  handler?.()
}
