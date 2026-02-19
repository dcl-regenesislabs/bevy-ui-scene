import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  type Callback,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'

import { UiCanvasInformation, engine } from '@dcl/sdk/ecs'
import { ALMOST_WHITE, ALMOST_BLACK, ORANGE } from '../../utils/constants'
import { getBackgroundFromAtlas } from '../../utils/ui-utils'
import { COLOR } from '../color-palette'
import { isTruthy, noop } from '../../utils/function-utils'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { type InputOption } from '../../utils/definitions'
import { CONTEXT, getFontSize } from '../../service/fontsize-system'
// TODO REVIEW if makes worth: find a way to close list when clicking outside, maybe onMouseEnter/Leave state + onMouseDown

function DropdownStyled(props: {
  isOpen: boolean
  onMouseDown: Callback
  onListMouseLeave?: Callback
  onOptionMouseDown: (index: number, title: string) => void
  onOptionMouseEnter: (index: number) => void
  onOptionMouseLeave: (index: number) => void
  uiTransform?: UiTransformProps
  backgroundColor?: Color4
  title: string
  fontSize: number
  fontColor?: Color4
  value: number
  entered: number
  scroll?: boolean
  options: InputOption[]
  disabled?: boolean
  listMaxHeight?: number
}): ReactEcs.JSX.Element | null {
  const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (canvasInfo === null) return null
  const { scroll = true, fontSize = getFontSize({ context: CONTEXT.DIALOG }) } =
    props
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        ...props.uiTransform
      }}
    >
      {/* TITLE AND ICON */}
      {(props.title?.length && (
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            margin: { bottom: fontSize * 0.3 }
          }}
        >
          {/* Title */}
          <UiEntity
            uiTransform={{
              width: 'auto',
              height: fontSize
            }}
            uiText={{
              value: props.title,
              fontSize: fontSize,
              color: props.fontColor ?? ALMOST_WHITE
            }}
          />
        </UiEntity>
      )) ||
        null}

      {/* DROPDOWN */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexGrow: 1,
          flexShrink: 0,
          padding: { right: fontSize * 0.3 },
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: fontSize / 2,
          borderWidth: 0
        }}
        uiBackground={{
          color: COLOR.WHITE
        }}
        onMouseDown={props.onMouseDown}
      >
        {/* TEXT */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: fontSize * 2.2
          }}
          uiText={{
            value: props.options[props.value]?.label ?? '<unselectable value>',
            fontSize: fontSize,
            color: props.fontColor ?? ALMOST_BLACK,
            textAlign: 'middle-left'
          }}
        />

        {/* ICON */}
        <UiEntity
          uiTransform={{
            width: fontSize,
            height: fontSize
          }}
          uiBackground={{
            ...getBackgroundFromAtlas({
              atlasName: 'icons',
              spriteName: 'DownArrow'
            }),
            color: Color4.Black()
          }}
        />
        {/* LIST */}
        <UiEntity
          uiTransform={{
            display: props.isOpen ? 'flex' : 'none',
            width: '100%',
            height:
              props.listMaxHeight ??
              (scroll
                ? props.options.length >= 4
                  ? fontSize * 2.1 * 4
                  : fontSize * props.options.length * 2.1
                : undefined),
            maxHeight: props.listMaxHeight,
            positionType: 'absolute',
            position: { left: 0, top: 2.5 * fontSize },
            zIndex: isTruthy(props.uiTransform?.zIndex)
              ? (props.uiTransform?.zIndex ?? 0) + 2
              : 2,
            borderRadius: getContentScaleRatio() * 30,
            borderWidth: 0,
            borderColor: COLOR.BLACK_TRANSPARENT
          }}
          uiBackground={{
            color: ALMOST_WHITE
          }}
          onMouseLeave={() => {
            ;(props.onListMouseLeave ?? noop)()
          }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              flexDirection: 'column',
              overflow: scroll ? 'scroll' : undefined
              // scrollVisible: 'hidden'
            }}
          >
            <UiEntity
              uiTransform={{
                width: '95%',
                height: '95%',
                flexDirection: 'column',
                margin: '2.5%'
              }}
            >
              {props.options.map((option, index) => (
                <UiEntity
                  key={option.value}
                  uiTransform={{
                    width: '100%',
                    height: 'auto',
                    flexDirection: 'column'
                  }}
                >
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: '100%',
                      display: index > 0 ? 'flex' : 'none'
                    }}
                  />
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: '100%',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    uiBackground={{
                      color:
                        index === props.entered
                          ? COLOR.DROPDOWN_ITEM_HOVER
                          : ALMOST_WHITE
                    }}
                    onMouseDown={() => {
                      props.onOptionMouseDown(index, props.title)
                    }}
                    onMouseEnter={() => {
                      props.onOptionMouseEnter(index)
                    }}
                    onMouseLeave={() => {
                      props.onOptionMouseLeave(index)
                    }}
                  >
                    <UiEntity
                      uiTransform={{
                        width: 'auto',
                        height: '100%'
                      }}
                      uiText={{
                        value: option.label,
                        fontSize: fontSize,
                        color: ALMOST_BLACK,
                        textAlign: 'middle-left'
                      }}
                    />

                    <UiEntity
                      uiTransform={{
                        display: props.value === index ? 'flex' : 'none',
                        width: fontSize,
                        height: fontSize,
                        margin: { right: fontSize * 0.3 }
                      }}
                      uiBackground={{
                        ...getBackgroundFromAtlas({
                          atlasName: 'icons',
                          spriteName: 'Check'
                        }),
                        color: ORANGE
                      }}
                    />
                  </UiEntity>
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: fontSize * 0.1
                    }}
                  />
                </UiEntity>
              ))}
            </UiEntity>
          </UiEntity>
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

export default DropdownStyled
