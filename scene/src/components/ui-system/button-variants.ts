import { type Color4 } from '@dcl/sdk/math'
import { COLOR } from '../color-palette'

export type ButtonVariant =
  | 'transparent'
  | 'subtle'
  | 'primary'
  | 'black'
  | 'destructive'

export type ButtonVariantStyle = {
  bg: { base: Color4; hover: Color4; active: Color4 }
  /** Foreground color: used as text color in `ButtonComponent` and as
   *  icon color in `ButtonIcon`. Both components read the same field. */
  contentColor: { base: Color4; hover?: Color4; active?: Color4 }
  borderColor: Color4
}

/**
 * Shared variant table consumed by `ButtonComponent`, `ButtonIcon`,
 * `ThinButton`, `ThinMenuButton`, `ThinChevronButton`. Single source of
 * truth so hover/active states stay consistent across button shapes.
 *
 * Variants that don't paint a visible border use `BLACK_TRANSPARENT` so
 * the layout slot stays reserved — that way swapping to a coloured
 * border on hover doesn't shift the surrounding layout.
 */
export const VARIANT_STYLES: Record<ButtonVariant, ButtonVariantStyle> = {
  transparent: {
    bg: {
      base: COLOR.BLACK_TRANSPARENT,
      hover: COLOR.WHITE_OPACITY_1,
      active: COLOR.WHITE_OPACITY_2
    },
    contentColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT
  },
  subtle: {
    bg: {
      base: COLOR.WHITE_OPACITY_0,
      hover: COLOR.WHITE_OPACITY_2,
      active: COLOR.WHITE_OPACITY_3
    },
    contentColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT
  },
  primary: {
    bg: {
      base: COLOR.BUTTON_PRIMARY,
      hover: COLOR.BUTTON_PRIMARY_HOVER,
      active: COLOR.BUTTON_PRIMARY_HOVER
    },
    contentColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT
  },
  black: {
    bg: {
      base: COLOR.BLACK,
      hover: COLOR.MENU_ITEM_BACKGROUND,
      active: COLOR.MENU_ITEM_BACKGROUND
    },
    contentColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT
  },
  destructive: {
    bg: {
      base: COLOR.BLACK_TRANSPARENT,
      hover: { ...COLOR.RED, a: 0.15 },
      active: { ...COLOR.RED, a: 0.25 }
    },
    contentColor: { base: COLOR.WHITE, hover: COLOR.RED, active: COLOR.RED },
    borderColor: COLOR.BLACK_TRANSPARENT
  }
}
