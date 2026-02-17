import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { ButtonIcon } from '../button-icon'
import { NavButton } from '../nav-button/NavButton'
import { getPaginationItems } from './pagination-util'
import { ROUNDED_TEXTURE_BACKGROUND, TRANSPARENT } from '../../utils/constants'
import { noop } from '../../utils/function-utils'
import { CONTEXT, getFontSize } from '../../service/fontsize-system'

export type PaginationProps = {
  pages: number
  currentPage: number
  onChange: (pageElement: number) => void
  disabled?: boolean
  uiTransform?: UiTransformProps
}

const getCachedItems = memoize2(getPaginationItems)

export function Pagination({
  pages,
  currentPage,
  onChange = noop,
  disabled = false,
  uiTransform
}: PaginationProps): ReactElement | null {
  const pageElements = getCachedItems(currentPage, pages)
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const iconSize = fontSize * 2
  if (pages <= 1) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        ...uiTransform
      }}
    >
      <ButtonIcon
        icon={{ spriteName: 'LeftArrow', atlasName: 'icons' }}
        iconSize={iconSize}
        uiTransform={{
          height: '60%'
        }}
        uiBackground={{
          ...ROUNDED_TEXTURE_BACKGROUND,
          color: Color4.create(1, 1, 1, 0.04)
        }}
        onMouseDown={() => {
          if (!disabled) {
            onChange(currentPage === 1 ? pages : currentPage - 1)
          }
        }}
      />
      {pageElements.map((pageElement) => (
        <UiEntity key={pageElement} uiTransform={{ margin: fontSize / 4 }}>
          <NavButton
            active={currentPage === pageElement}
            text={pageElement.toString()}
            backgroundColor={
              currentPage === pageElement ? undefined : TRANSPARENT
            }
            color={Color4.White()}
            onClick={() => {
              if (pageElement !== currentPage && !disabled) {
                onChange(pageElement)
              }
            }}
          />
        </UiEntity>
      ))}
      <ButtonIcon
        uiTransform={{
          height: '60%'
        }}
        uiBackground={{
          ...ROUNDED_TEXTURE_BACKGROUND,
          color: Color4.create(1, 1, 1, 0.04)
        }}
        icon={{ spriteName: 'RightArrow', atlasName: 'icons' }}
        iconSize={iconSize}
        onMouseDown={() => {
          if (!disabled) {
            onChange(currentPage === pages ? 1 : currentPage + 1)
          }
        }}
      />
    </UiEntity>
  )
}

function memoize2(
  fn: (a: number, b: number) => number[]
): (a: number, b: number) => number[] {
  const cache = new Map<number, Map<number, number[]>>()

  return (a: number, b: number): number[] => {
    if (cache.has(a) && cache.get(a)?.has(b) === true) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return cache.get(a)!.get(b)!
    }
    const result = fn(a, b)
    if (!cache.has(a)) {
      cache.set(a, new Map())
    }
    cache.get(a)?.set(b, result)
    return result
  }
}
