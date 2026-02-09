import { getViewportHeight } from './canvas-ratio'
import { getContentScaleRatio } from './canvas-ratio'

enum CONTEXT {
  SIDE,
  DIALOG
}

enum TYPOGRAPHY_TOKENS {
  TITLE_XL,
  TITLE_L,
  TITLE_M,
  BODY,
  BODY_S,
  LABEL,
  TAG,
  CAPTION,
  MONO
}

const TYPO_SCALE: Record<TYPOGRAPHY_TOKENS, number> = {
  [TYPOGRAPHY_TOKENS.TITLE_XL]: 2.4,
  [TYPOGRAPHY_TOKENS.TITLE_L]: 1.9,
  [TYPOGRAPHY_TOKENS.TITLE_M]: 1.4,
  [TYPOGRAPHY_TOKENS.BODY]: 1.0,
  [TYPOGRAPHY_TOKENS.BODY_S]: 0.9,
  [TYPOGRAPHY_TOKENS.LABEL]: 0.85,
  [TYPOGRAPHY_TOKENS.TAG]: 0.8,
  [TYPOGRAPHY_TOKENS.CAPTION]: 0.75,
  [TYPOGRAPHY_TOKENS.MONO]: 0.95
}

const BASE_FONT_SIZE = 14

export function getFontSize({
  context = CONTEXT.SIDE,
  token = TYPOGRAPHY_TOKENS.BODY
}): number {
  const scale = TYPO_SCALE[token]
  if (context === CONTEXT.DIALOG) {
    return BASE_FONT_SIZE * scale * getContentScaleRatio()
  }
  return getViewportHeight() * 0.015 * scale
}
