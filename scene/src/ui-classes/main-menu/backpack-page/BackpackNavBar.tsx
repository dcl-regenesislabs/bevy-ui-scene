import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { store } from '../../../state/store'
import { NavButton } from '../../../components/nav-button/NavButton'
import { BACKPACK_SECTION } from '../../../state/backpack/state'
import { ITEMS_CATALOG_PAGE_SIZE } from '../../../utils/backpack-constants'
import { getPlayer } from '@dcl/sdk/src/players'
import {
  SORT_OPTIONS,
  SORT_OPTIONS_MAP,
  SORT_OPTIONS_PARAMS,
  ZERO_ADDRESS
} from '../../../utils/constants'
import {
  changeSectionAction,
  updateSearchFilterAction
} from '../../../state/backpack/actions'
import { updatePage } from './ItemCatalog'
import { fetchWearablesPage } from '../../../utils/wearables-promise-utils'
import { getRealm } from '~system/Runtime'
import {
  playPreviewEmote,
  setAvatarPreviewCameraToWearableCategory
} from '../../../components/backpack/AvatarPreview'
import { fetchEmotesPage } from '../../../utils/emotes-promise-utils'
import { WEARABLE_CATEGORY_DEFINITIONS } from '../../../service/categories'
import { Checkbox } from '../../../components/checkbox'
import { Input, UiTransformProps } from '@dcl/sdk/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Color4 } from '@dcl/sdk/math'
import { debounce } from '../../../utils/dcl-utils'
import { updatePageGeneric } from './backpack-service'
import { DropdownComponent } from '../../../components/dropdown-component'
import Icon from '../../../components/icon/Icon'
import { getMainMenuHeight } from '../MainMenu'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'

const debouncedSearch = debounce((name: string) => {
  updatePageGeneric().catch(console.error)
}, 600)

export function BackpackNavBar(): ReactElement {
  const backpackState = store.getState().backpack
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const NAV_BUTTON_HEIGHT = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.NAV_BUTTON_HEIGHT
  })
  return (
    <NavBar>
      <LeftSection>
        <NavBarTitle text={'<b>Backpack</b>'} />
        {/* NAV-BUTTON-BAR */}
        <NavButtonBar>
          <NavButton
            icon={{
              spriteName: 'Wearables',
              atlasName: 'icons'
            }}
            active={backpackState.activeSection === BACKPACK_SECTION.WEARABLES}
            text={'Wearables'}
            onClick={() => {
              const backpackState = store.getState().backpack
              if (backpackState.loadingPage) return
              const pageParams = {
                pageNum: backpackState.currentPage,
                pageSize: ITEMS_CATALOG_PAGE_SIZE,
                address: getPlayer()?.userId ?? ZERO_ADDRESS,
                cacheKey: store.getState().backpack.cacheKey
              }
              store.dispatch(changeSectionAction(BACKPACK_SECTION.WEARABLES))
              updatePage(
                async () =>
                  await fetchWearablesPage(
                    (await getRealm({}))?.realmInfo?.baseUrl
                  )({
                    ...pageParams,
                    wearableCategory: backpackState.activeWearableCategory,
                    searchFilter: backpackState.searchFilter
                  })
              ).catch(console.error)
              setAvatarPreviewCameraToWearableCategory(
                backpackState.activeWearableCategory
              )
              playPreviewEmote('')
            }}
          />
          <NavButton
            icon={{
              spriteName: 'outfits-icon',
              atlasName: 'backpack'
            }}
            active={backpackState.activeSection === BACKPACK_SECTION.OUTFITS}
            text={'Outfits'}
            onClick={() => {
              const backpackState = store.getState().backpack
              if (backpackState.loadingPage) return
              setAvatarPreviewCameraToWearableCategory(null)
              store.dispatch(changeSectionAction(BACKPACK_SECTION.OUTFITS))
            }}
          />
          <NavButton
            icon={{
              spriteName: 'Emotes',
              atlasName: 'icons'
            }}
            active={backpackState.activeSection === BACKPACK_SECTION.EMOTES}
            text={'Emotes'}
            onClick={() => {
              const backpackState = store.getState().backpack
              if (backpackState.loadingPage) return
              store.dispatch(changeSectionAction(BACKPACK_SECTION.EMOTES))
              const pageParams = {
                pageNum: backpackState.currentPage,
                pageSize: ITEMS_CATALOG_PAGE_SIZE,
                address: getPlayer()?.userId ?? ZERO_ADDRESS,
                cacheKey: store.getState().backpack.cacheKey,
                searchFilter: backpackState.searchFilter
              }
              updatePage(async () => await fetchEmotesPage(pageParams)).catch(
                console.error
              )
              setAvatarPreviewCameraToWearableCategory(
                WEARABLE_CATEGORY_DEFINITIONS.body_shape.id
              )
            }}
          />
        </NavButtonBar>
      </LeftSection>
      {backpackState.activeSection !== BACKPACK_SECTION.OUTFITS && (
        <RightSection>
          <Checkbox
            fontSize={fontSize}
            uiTransform={{
              margin: { right: '1%' }
            }}
            onChange={() => {
              store.dispatch(
                updateSearchFilterAction({
                  ...backpackState.searchFilter,
                  collectiblesOnly: !backpackState.searchFilter.collectiblesOnly
                })
              )
              updatePageGeneric().catch(console.error)
            }}
            value={backpackState.searchFilter.collectiblesOnly}
            label={'Collectibles only'}
          />
          <SearchBox
            uiTransform={{
              height: NAV_BUTTON_HEIGHT
            }}
          />
          <UiEntity
            uiTransform={{
              width: 'auto',
              flexShrink: 0,
              flexGrow: 0,
              height: '100%',
              justifyContent: 'center'
            }}
          >
            <UiEntity
              uiTransform={{
                alignSelf: 'center',
                flexShrink: 0
              }}
              uiText={{
                value: 'Sort: ',
                fontSize
              }}
            />
            <DropdownComponent
              uiTransform={{
                width: fontSize * 7,
                height: NAV_BUTTON_HEIGHT,
                alignSelf: 'center'
              }}
              options={SORT_OPTIONS_MAP}
              value={
                SORT_OPTIONS[
                  SORT_OPTIONS_PARAMS.findIndex(([orderBy, orderDirection]) => {
                    return (
                      orderBy ===
                        store.getState().backpack.searchFilter.orderBy &&
                      orderDirection ===
                        store.getState().backpack.searchFilter.orderDirection
                    )
                  })
                ]
              }
              fontSize={fontSize}
              onChange={(value) => {
                const [orderBy, orderDirection] =
                  SORT_OPTIONS_PARAMS[SORT_OPTIONS.indexOf(value)]
                store.dispatch(
                  updateSearchFilterAction({ orderBy, orderDirection })
                )
                updatePageGeneric().catch(console.error)
              }}
            />
          </UiEntity>
        </RightSection>
      )}
    </NavBar>
  )
}

export function NavBar({
  children
}: {
  children?: ReactElement
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        width: '100%',
        height: getMainMenuHeight(),
        pointerFilter: 'block',
        zIndex: 2
      }}
      uiBackground={{
        color: { ...Color4.Black(), a: 0.4 }
      }}
    >
      {children}
    </UiEntity>
  )
}

export function LeftSection({
  children
}: {
  children?: ReactElement
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        height: '100%',
        flexDirection: 'row',
        padding: 0,
        alignItems: 'center',
        alignSelf: 'flex-start'
      }}
    >
      {children}
    </UiEntity>
  )
}

export function RightSection({
  children
}: {
  children?: ReactElement
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        height: '100%',
        flexDirection: 'row',
        padding: { right: '1%' },
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexGrow: 1
      }}
    >
      {children}
    </UiEntity>
  )
}

export function NavBarTitle({ text }: { text: string }): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        padding: 0
      }}
      uiText={{
        value: text,
        fontSize: getFontSize({
          context: CONTEXT.DIALOG,
          token: TYPOGRAPHY_TOKENS.TITLE_L
        }),
        textWrap: 'nowrap'
      }}
    />
  )
}

function SearchBox({
  uiTransform
}: {
  uiTransform: UiTransformProps
}): ReactElement {
  const backpackState = store.getState().backpack
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        width: '25%',
        height: '100%',
        ...uiTransform
      }}
    >
      <Icon
        uiTransform={{
          alignSelf: 'center',
          position: { right: -fontSize * 1.5 },
          zIndex: 1
        }}
        icon={{ atlasName: 'backpack', spriteName: 'search-icon' }}
        iconSize={fontSize}
        iconColor={COLOR.TEXT_COLOR}
      />
      <Input
        uiTransform={{
          width: getMainMenuHeight() * 6,
          alignSelf: 'center',
          borderWidth: 0,
          borderRadius: fontSize / 2,
          padding: {
            top: fontSize / 1.5,
            left: fontSize * 2,
            right: fontSize / 4
          }
        }}
        uiBackground={{
          color: Color4.White()
        }}
        fontSize={fontSize}
        value={backpackState.searchFilter.name}
        placeholder={'Search by name ...'}
        onChange={(name) => {
          if (name !== backpackState.searchFilter.name) {
            store.dispatch(updateSearchFilterAction({ name }))
            debouncedSearch(name)
          }
        }}
      />
    </UiEntity>
  )
}

export function NavButtonBar({
  children
}: {
  children?: ReactElement
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }}
      uiBackground={{
        color: { ...Color4.Blue(), a: 0.0 }
      }}
    >
      {children}
    </UiEntity>
  )
}
