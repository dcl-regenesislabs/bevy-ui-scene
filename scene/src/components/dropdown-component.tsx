import { DropdownStyled } from './dropdown-styled'

import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { noop } from '../utils/function-utils'
import { timers } from '@dcl-sdk/utils'
import { type InputOption } from '../utils/definitions'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { CONTEXT, getFontSize } from '../service/fontsize-system'
import { listenSystemAction } from '../service/system-actions-emitter'
import {
  createDropdownId,
  isDropdownOpen,
  closeOpenDropdown,
  wrapDropdownHandlerWorkaround,
  subscribeDropdown
} from '../service/dropdown-open-registry'

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
  const [entered, setEntered] = useState<number | null>(null)
  const [id] = useState(() => createDropdownId())
  // Open state lives in the service (single source of truth). We mirror it into
  // local state via a subscription, so this component re-renders only when its
  // own open state changes.
  const [open, setOpen] = useState(() => isDropdownOpen(id))

  useEffect(() => {
    const sync = (): void => {
      setOpen(isDropdownOpen(id))
    }
    sync() // catch any change between initial render and subscribing
    return subscribeDropdown(sync)
  }, [id])

  // While open, close on ESC ('Cancel'). The global ESC handler (MainHud) yields
  // precedence to an open dropdown instead of closing the menu behind it.
  useEffect(() => {
    if (!open) return
    const unlisten = listenSystemAction('Cancel', (pressed: boolean) => {
      if (pressed) closeOpenDropdown()
    })
    return () => {
      setEntered(null)
      unlisten()
    }
  }, [open])

  return (
    <DropdownStyled
      scroll={scroll}
      uiTransform={uiTransform}
      isOpen={open}
      onMouseDown={() => {
        if (!disabled) wrapDropdownHandlerWorkaround(id, noop)
      }}
      onOptionMouseDown={(index) => {
        onChange(options[index].value)
        closeOpenDropdown()
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
