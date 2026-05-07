import { ButtonComponent } from '../button-component'

/**
 * @deprecated Renamed to `ButtonComponent`. Import from
 * `'../components/button-component'` instead. This alias re-exports the
 * new component so existing imports still resolve, but new code should
 * use the new name.
 *
 * The new API is variant-based — drop your `backgroundColor` /
 * `fontColor` / `iconColor` props and use `variant="..."` instead.
 */
const ButtonTextIcon = ButtonComponent

export default ButtonTextIcon
