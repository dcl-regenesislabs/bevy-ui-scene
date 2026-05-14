import { type Color4 } from '@dcl/sdk/math'
import { COLOR } from './color-palette'

export type ButtonVariant = 'transparent' | 'subtle' | 'primary' | 'black'

export type ButtonVariantStyle = {
  bg: { base: Color4; hover: Color4; active: Color4 }
  textColor: { base: Color4; hover?: Color4; active?: Color4 }
  borderColor: Color4
}

/**
 * Shared variant table consumed by `ButtonComponent`, `ThinButton`,
 * `ThinMenuButton`, `ThinChevronButton`. Single source of truth so
 * hover/active states stay consistent across button shapes.
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
    textColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT
  },
  subtle: {
    bg: {
      base: COLOR.WHITE_OPACITY_0,
      hover: COLOR.WHITE_OPACITY_2,
      active: COLOR.WHITE_OPACITY_3
    },
    textColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT
  },
  primary: {
    bg: {
      base: COLOR.BUTTON_PRIMARY,
      hover: COLOR.BUTTON_PRIMARY_HOVER,
      active: COLOR.BUTTON_PRIMARY_HOVER
    },
    textColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT
  },
  black: {
    bg: {
      base: COLOR.BLACK,
      hover: COLOR.MENU_ITEM_BACKGROUND,
      active: COLOR.MENU_ITEM_BACKGROUND
    },
    textColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT
  }
}
