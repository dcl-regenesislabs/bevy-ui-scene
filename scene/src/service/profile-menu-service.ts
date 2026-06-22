import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { store } from '../state/store'
import { pushPopupAction } from '../state/hud/actions'
import { HUD_POPUP_TYPE } from '../state/hud/state'
import { resolvePlayerData } from '../utils/passport-promise-utils'
import { ONE_ADDRESS, ZERO_ADDRESS } from '../utils/constants'

export type OpenProfileMenuOptions = {
  userId: string
  /** Optional display data — when present we skip the async name resolution. */
  name?: string
  hasClaimedName?: boolean
  /** When true the menu never opens (guests have no persistent profile). */
  isGuest?: boolean
}

/**
 * Open the user profile menu (`HUD_POPUP_TYPE.PROFILE_MENU`) for `userId`.
 *
 * Shared entry point so `AvatarCircle` / `PlayerNameComponent` behave the same
 * everywhere. No-op for guests, the special zero/one addresses, or when a
 * profile menu is already on top — the last guard prevents double-open from
 * event bubbling and re-opening from inside the menu's own header.
 *
 * When `name`/`hasClaimedName` are supplied the menu opens immediately with a
 * minimal player stub; otherwise the data is resolved first.
 */
export function openProfileMenu(opts: OpenProfileMenuOptions): void {
  const userId = opts.userId
  if (userId == null || userId.length === 0) return
  if (userId === ZERO_ADDRESS || userId === ONE_ADDRESS) return
  if (opts.isGuest === true) return
  if (getPlayer({ userId })?.isGuest === true) return

  const popups = store.getState().hud.shownPopups
  if (popups[popups.length - 1]?.type === HUD_POPUP_TYPE.PROFILE_MENU) return

  executeTask(async () => {
    const player =
      opts.name != null
        ? {
            userId: userId.toLowerCase(),
            name: opts.name,
            hasClaimedName: opts.hasClaimedName ?? false,
            isGuest: false
          }
        : await resolvePlayerData(userId).then((data) => ({
            userId: data.userId.toLowerCase(),
            name: data.name,
            hasClaimedName: data.hasClaimedName,
            isGuest: false
          }))
    store.dispatch(
      pushPopupAction({ type: HUD_POPUP_TYPE.PROFILE_MENU, data: { player } })
    )
  })
}
