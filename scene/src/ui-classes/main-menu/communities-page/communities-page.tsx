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
import { fetchMyCommunities } from '../../../utils/communities-promise-utils'
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
import { cancelBrowseLoad, CommunitiesCatalog } from './communities-catalog'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { BottomBorder, TopBorder } from '../../../components/bottom-border'

export default class CommunitiesPage {
  mainUi(): ReactElement {
    return <CommunitiesContent />
  }
}

function CommunitiesContent(): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const [myCommunities, setMyCommunities] = useState<CommunityListItem[]>([])
  const [loadingSidebar, setLoadingSidebar] = useState<boolean>(true)
  const [searchText, setSearchText] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')

  const onSearchChange = debounce((text: string) => {
    setDebouncedSearch(text)
  }, 600)

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

    return () => {
      cancelBrowseLoad()
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
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLOR.RED
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
              margin: { bottom: fontSize },
              flexShrink: 0
            }}
            uiText={{
              value: '<b>My Communities</b>',
              fontSize,
              color: COLOR.TEXT_COLOR_WHITE,
              textAlign: 'top-left'
            }}
          />
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

        {/* Right content - Browse */}
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
          <CommunitiesCatalog searchText={debouncedSearch} />
        </Column>
      </ResponsiveContent>
    </MainContent>
  )
}
