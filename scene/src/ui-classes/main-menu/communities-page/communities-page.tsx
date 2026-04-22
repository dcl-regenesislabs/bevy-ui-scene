import ReactEcs, { Input, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { MainContent, ResponsiveContent } from '../backpack-page/BackpackPage'
import {
  LeftSection,
  NavBar,
  NavBarTitle,
  RightSection
} from '../backpack-page/BackpackNavBar'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { executeTask } from '@dcl/sdk/ecs'
import {
  fetchMyCommunities,
  fetchUserInviteRequests
} from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import {
  type CommunityListItem,
  getCommunityThumbnailUrl
} from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'

import { getMainMenuHeight } from '../MainMenu'
import Icon from '../../../components/icon/Icon'
import { debounce } from '../../../utils/dcl-utils'
import { Color4 } from '@dcl/sdk/math'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { cancelBrowseLoad, CommunitiesCatalog } from './communities-catalog'
import { CommunityInvitesAndRequests } from './community-invites-and-requests'
import { CommunityMyCommunities } from './community-my-communities'
import { listenCommunitiesChanged } from '../../../service/communities-events'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { BottomBorder } from '../../../components/bottom-border'

export default class CommunitiesPage {
  mainUi(): ReactElement {
    return <CommunitiesContent />
  }
}

function CommunitiesContent(): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeCaption = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const [myCommunities, setMyCommunities] = useState<CommunityListItem[]>([])
  const [loadingSidebar, setLoadingSidebar] = useState<boolean>(true)
  const [searchText, setSearchText] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [view, setView] = useState<'catalog' | 'invites' | 'my-communities'>(
    'catalog'
  )
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0)

  const onSearchChange = debounce((text: string) => {
    setDebouncedSearch(text)
  }, 600)

  const refreshPendingInvites = (): void => {
    executeTask(async () => {
      try {
        const invites = await fetchUserInviteRequests('invite')
        setPendingInvitesCount(invites.length)
      } catch (error) {
        console.error('[communities] failed to load pending invites', error)
      }
    })
  }

  const refreshMyCommunities = (): void => {
    executeTask(async () => {
      try {
        const result = await fetchMyCommunities()
        setMyCommunities(result.results)
      } catch (error) {
        console.error('[communities] failed to refresh my communities', error)
      }
    })
  }

  useEffect(() => {
    executeTask(async () => {
      try {
        const result = await fetchMyCommunities()
        setMyCommunities(result.results)
      } catch (error) {
        console.error('[communities] failed to load my communities', error)
      }
      setLoadingSidebar(false)
    })
    refreshPendingInvites()

    const unsubscribe = listenCommunitiesChanged(() => {
      refreshMyCommunities()
      refreshPendingInvites()
    })

    return () => {
      cancelBrowseLoad()
      unsubscribe()
    }
  }, [])

  return (
    <MainContent>
      <NavBar>
        <LeftSection>
          <NavBarTitle text={'<b>Communities</b>'} />
        </LeftSection>
        <RightSection>
          <UiEntity
            uiTransform={{
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Icon
              uiTransform={{
                alignSelf: 'center',
                position: { right: -fontSize * 1.5 },
                zIndex: 1
              }}
              icon={{ atlasName: 'icons', spriteName: 'Search' }}
              iconSize={fontSize}
              iconColor={COLOR.TEXT_COLOR}
            />
            <Input
              uiTransform={{
                height: getFontSize({
                  context: CONTEXT.DIALOG,
                  token: TYPOGRAPHY_TOKENS.NAV_BUTTON_HEIGHT
                }),
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
              uiBackground={{ color: Color4.White() }}
              fontSize={fontSize}
              value={searchText ?? ''}
              placeholder={'Search communities...'}
              onChange={(text) => {
                setSearchText(text)
                onSearchChange(text)
              }}
            />
          </UiEntity>
        </RightSection>
      </NavBar>
      <ResponsiveContent>
        <Column
          uiTransform={{
            width: '22%',
            height: '100%',
            padding: {
              left: fontSize,
              right: fontSize,
              top: 0,
              bottom: fontSize
            }
          }}
          uiBackground={{ color: COLOR.DARK_OPACITY_2 }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              padding: 0,
              flexShrink: 0,
              alignItems: 'center'
            }}
            onMouseDown={() => {
              setView('invites')
            }}
          >
            <UiEntity
              uiText={{
                value: `<b>Invites & Requests</b>`,
                fontSize,
                color: COLOR.TEXT_COLOR_WHITE,
                textAlign: 'top-left'
              }}
            />
            <UiEntity uiTransform={{ flexGrow: 1 }} />
            {pendingInvitesCount > 0 && (
              <UiEntity
                uiTransform={{
                  borderRadius: 99,
                  height: fontSize,
                  width: fontSize
                }}
                uiBackground={{
                  color: COLOR.LINK_COLOR
                }}
                uiText={{
                  value: `${pendingInvitesCount}`,
                  fontSize: fontSizeCaption
                }}
              />
            )}

            <Icon
              icon={{ spriteName: 'RightArrow', atlasName: 'icons' }}
              iconColor={COLOR.LINK_COLOR}
              iconSize={fontSize}
            />
            <BottomBorder
              color={COLOR.WHITE_OPACITY_1}
              uiTransform={{
                height: 1,
                width: '111%',
                margin: { left: -fontSize }
              }}
            />
          </UiEntity>

          <UiEntity
            uiTransform={{
              width: '100%',
              padding: 0,
              flexShrink: 0,
              alignItems: 'center'
            }}
            onMouseDown={() => {
              setView('catalog')
            }}
          >
            <UiEntity
              uiText={{
                value: '<b>Browse Communities</b>',
                fontSize,
                color: COLOR.TEXT_COLOR_WHITE,
                textAlign: 'top-left'
              }}
            />
            <UiEntity uiTransform={{ flexGrow: 1 }} />
            <Icon
              icon={{ spriteName: 'RightArrow', atlasName: 'icons' }}
              iconColor={COLOR.LINK_COLOR}
              iconSize={fontSize}
            />
            <BottomBorder
              color={COLOR.WHITE_OPACITY_1}
              uiTransform={{
                height: 1,
                width: '111%',
                margin: { left: -fontSize }
              }}
            />
          </UiEntity>

          <UiEntity
            uiTransform={{
              width: '100%',
              padding: 0,
              margin: { bottom: fontSize },
              flexShrink: 0,
              alignItems: 'center'
            }}
            onMouseDown={() => {
              setView('my-communities')
            }}
          >
            <UiEntity
              uiText={{
                value: '<b>My Communities</b>',
                fontSize,
                color: COLOR.TEXT_COLOR_WHITE,
                textAlign: 'top-left'
              }}
            />
            <UiEntity uiTransform={{ flexGrow: 1 }} />
            <Icon
              icon={{ spriteName: 'RightArrow', atlasName: 'icons' }}
              iconColor={COLOR.LINK_COLOR}
              iconSize={fontSize}
            />
          </UiEntity>
          {loadingSidebar ? (
            <LoadingPlaceholder
              uiTransform={{
                width: '100%',
                flexGrow: 1,
                borderRadius: fontSize / 2
              }}
              uiText={{ value: 'Loading my communities...' }}
            />
          ) : (
            <Column
              uiTransform={{
                width: '100%',
                flexGrow: 1,
                overflow: 'scroll',
                scrollVisible: 'vertical'
              }}
            >
              {(myCommunities ?? []).map((community) => {
                const thumbSize = fontSize * 3
                return (
                  <Row
                    key={community.id}
                    uiTransform={{
                      width: '100%',
                      alignItems: 'center',
                      margin: { bottom: fontSize * 0.5 },
                      padding: {
                        top: fontSize * 0.3,
                        bottom: fontSize * 0.3
                      }
                    }}
                    onMouseDown={() => {
                      store.dispatch(
                        pushPopupAction({
                          type: HUD_POPUP_TYPE.COMMUNITY_VIEW,
                          data: community
                        })
                      )
                    }}
                  >
                    <UiEntity
                      uiTransform={{
                        width: thumbSize,
                        height: thumbSize,
                        borderRadius: fontSize / 2,
                        flexShrink: 0,
                        margin: { right: fontSize * 0.5 }
                      }}
                      uiBackground={{
                        textureMode: 'stretch',
                        texture: {
                          src: getCommunityThumbnailUrl(community.id)
                        }
                      }}
                    />
                    <UiEntity
                      uiTransform={{ flexShrink: 1 }}
                      uiText={{
                        value: community.name,
                        fontSize,
                        color: COLOR.TEXT_COLOR_WHITE,
                        textAlign: 'middle-left'
                      }}
                    />
                  </Row>
                )
              })}
              {(myCommunities ?? []).length === 0 && (
                <UiEntity
                  uiText={{
                    value: 'No communities yet',
                    fontSize,
                    color: COLOR.TEXT_COLOR_GREY
                  }}
                />
              )}
            </Column>
          )}
        </Column>

        {/* Right content - Browse or Invites & Requests */}
        <Column
          uiTransform={{
            width: '78%',
            height: '100%',
            padding: {
              left: fontSize * 2,
              right: fontSize * 2,
              top: fontSize
            }
          }}
        >
          {view === 'catalog' && (
            <CommunitiesCatalog searchText={debouncedSearch} />
          )}
          {view === 'invites' && (
            <CommunityInvitesAndRequests
              onBack={() => {
                setView('catalog')
                refreshPendingInvites()
              }}
              onInviteAccepted={() => {
                refreshPendingInvites()
                refreshMyCommunities()
              }}
              onInviteRejected={refreshPendingInvites}
            />
          )}
          {view === 'my-communities' && (
            <CommunityMyCommunities
              communities={myCommunities}
              loading={loadingSidebar}
              onBack={() => {
                setView('catalog')
              }}
            />
          )}
        </Column>
      </ResponsiveContent>
    </MainContent>
  )
}
