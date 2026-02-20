import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import Icon from '../icon/Icon'
import {
  getRightPanelWidth,
  getViewportWidth
} from '../../service/canvas-ratio'
import {
  type FilterDefinition,
  MAP_FILTER_DEFINITIONS
} from './map-definitions'
import { COLOR } from '../color-palette'
import { store } from '../../state/store'
import { noop } from '../../utils/function-utils'
import { updateHudStateAction } from '../../state/hud/actions'
import { isSceneCatalogExpanded } from './scene-catalog-panel'
import { CONTEXT, getFontSize } from '../../service/fontsize-system'

export function MapFilterBar(): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
        width:
          getViewportWidth() -
          (isSceneCatalogExpanded() ? getRightPanelWidth() : 0),
        flexWrap: 'wrap'
      }}
    >
      {MAP_FILTER_DEFINITIONS.map((filterDefinition) => (
        <MapFilterBarButton
          active={store
            .getState()
            .hud.mapFilterCategories.includes(filterDefinition.id)}
          key={filterDefinition.id}
          filterDefinition={filterDefinition}
          onClick={() => {
            store.dispatch(
              updateHudStateAction({
                mapFilterCategories: [filterDefinition.id]
              })
            )
          }}
        />
      ))}
    </UiEntity>
  )
}

export function MapFilterBarButton({
  filterDefinition,
  fontSize = getFontSize({ context: CONTEXT.DIALOG }),
  active = false,
  key,
  onClick = noop
}: {
  filterDefinition: FilterDefinition
  fontSize?: number
  active?: boolean
  key?: string
  onClick?: () => void
}): ReactElement {
  const { spriteName, label } = filterDefinition
  return (
    <UiEntity
      uiTransform={{
        borderRadius: 9999,
        borderColor: active
          ? COLOR.ACTIVE_BACKGROUND_COLOR
          : COLOR.BLACK_TRANSPARENT,
        borderWidth: fontSize * 0.2,
        flexGrow: 0,
        flexShrink: 0,
        margin: '0.2%'
      }}
      uiBackground={{
        color: COLOR.WHITE
      }}
      onMouseDown={onClick}
    >
      {spriteName && (
        <Icon
          uiTransform={{
            alignSelf: 'center',
            flexShrink: 0,
            position: { left: '8%' }
          }}
          iconSize={fontSize * 1.5}
          icon={{ spriteName, atlasName: 'map2' }}
        />
      )}
      <UiEntity
        uiText={{
          textWrap: 'nowrap',
          value: `<b> ${label.toUpperCase()}</b>`,
          fontSize,
          color: COLOR.TEXT_COLOR
        }}
      />
    </UiEntity>
  )
}
