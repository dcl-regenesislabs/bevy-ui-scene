import { showAlertPopup } from '../components/alert-popup'
import { COLOR } from '../components/color-palette'

/**
 * If `error` is the backend's "banned" / "not a member" 401 raised by a
 * community action (like/unlike, posting, etc.), show a friendly OK-only
 * alert and return `true`. Otherwise return `false` so the caller can fall
 * back to its normal error handling.
 *
 * Note: banning a user kicks them out, so in a PRIVATE community a banned
 * user is reported as "not a member" (the membership check runs before the
 * ban check). The "is banned" wording only surfaces in PUBLIC communities.
 */
export function maybeShowCommunityRestrictionAlert(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  if (!message.includes('HTTP 401')) return false

  let friendly: string | null = null
  if (message.includes('is banned from community')) {
    friendly =
      'You cannot execute this action because you are banned in this community.'
  } else if (message.includes('is not a member')) {
    friendly =
      'You cannot execute this action because you are not a member of this community.'
  }
  if (friendly == null) return false

  showAlertPopup({
    title: 'Action not allowed',
    message: friendly,
    icon: {
      spriteName: 'BlockUser',
      atlasName: 'icons',
      backgroundColor: COLOR.BUTTON_PRIMARY
    }
  })
  return true
}
