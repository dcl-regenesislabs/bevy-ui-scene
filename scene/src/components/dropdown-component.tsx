import { DropdownStyled } from './dropdown-styled'
import { getContentScaleRatio } from '../service/canvas-ratio'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { noop } from '../utils/function-utils'
import { timers } from '@dcl-sdk/utils'
import { type InputOption } from '../utils/definitions'
import useState = ReactEcs.useState
import { CONTEXT, getFontSize } from '../service/fontsize-system'

export type DropdownComponentProps = {
  uiTransform?: UiTransformProps
  options: InputOption[]
  value: any
  fontSize?: number
  onChange: (value: any) => void
  scroll?: boolean
  disabled?: boolean
  listMaxHeight?: number
}

export type DropdownState = Record<
  string,
  {
    open: boolean
    entered: number | null
  }
>

export function DropdownComponent({
  options = [{ label: '', value: null }],
  value = null,
  uiTransform,
  fontSize = getFontSize({ context: CONTEXT.DIALOG }),
  onChange = noop,
  scroll = false,
  disabled = false,
  listMaxHeight
}: DropdownComponentProps): ReactElement {
  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState<number | null>(null)

  return (
    <DropdownStyled
      scroll={scroll}
      uiTransform={uiTransform}
      isOpen={open}
      onMouseDown={() => {
        if (!disabled) {
          setOpen(!open)
        }
      }}
      onOptionMouseDown={(index) => {
        onChange(options[index].value)
        setOpen(false)
      }}
      onOptionMouseEnter={(index) => {
        setEntered(index)
      }}
      onOptionMouseLeave={(index) => {}}
      onListMouseLeave={() => {
        timers.setTimeout(() => {
          setEntered(null)
        }, 100)
      }}
      title={''}
      fontSize={fontSize}
      value={options.findIndex((o) => o.value === value)}
      entered={entered !== null ? entered ?? -1 : -1}
      options={options}
      disabled={disabled}
      listMaxHeight={listMaxHeight}
    />
  )
}
