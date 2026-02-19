import ReactEcs, { Button, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { store } from '../../../state/store'
import {
  closeLastPopupAction,
  HUD_ACTION,
  pushPopupAction,
  updateHudStateAction
} from '../../../state/hud/actions'
import {
  EMPTY_PROFILE_DATA,
  HUD_POPUP_TYPE,
  type HUDPopup,
  type ViewAvatarData
} from '../../../state/hud/state'
import { cloneDeep, memoize, noop } from '../../../utils/function-utils'
import { ResponsiveContent } from '../../main-menu/backpack-page/BackpackPage'
import { setAvatarPreviewCameraToWearableCategory } from '../../../components/backpack/AvatarPreview'
import { getBackgroundFromAtlas } from '../../../utils/ui-utils'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import {
  applyMiddleEllipsis,
  BASE_FEMALE_URN,
  getURNWithoutTokenId
} from '../../../utils/urn-utils'
import {
  type EquippedEmote,
  type GetPlayerDataRes,
  type URN,
  type URNWithoutTokenId
} from '../../../utils/definitions'
import { executeTask } from '@dcl/sdk/ecs'
import { WEARABLE_CATEGORY_DEFINITIONS } from '../../../service/categories'
import { TabComponent } from '../../../components/tab-component'
import { type Popup } from '../../../components/popup-stack'
import {
  fetchAllUserNames,
  fetchProfileData,
  saveProfileData
} from '../../../utils/passport-promise-utils'
import Icon from '../../../components/icon/Icon'
import {
  editablePropertyKeys,
  ProfilePropertyField
} from './profile-property-input'
import { ButtonIcon } from '../../../components/button-icon'
import { TopBorder } from '../../../components/bottom-border'
import { CopyButton } from '../../../components/copy-button'
import { getPlayer } from '@dcl/sdk/players'
import { CloseButton } from '../../../components/close-button'
import { Label } from '@dcl/sdk/react-ecs'
import { UserAvatarPreviewElement } from '../../../components/backpack/UserAvatarPreviewElement'
import { Column, Row } from '../../../components/layout'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { fetchWearablesData } from '../../../utils/wearables-promise-utils'
import { getRealm } from '~system/Runtime'
import type {
  EmoteEntityMetadata,
  WearableEntityMetadata
} from '../../../utils/item-definitions'

import { PassportEquippedItem } from './passport-equipped-item'
import { fetchEmotesData } from '../../../utils/emotes-promise-utils'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { waitFor } from '../../../utils/dcl-utils'

export type PassportPopupState = {
  loadingProfile: boolean
  savingProfile: boolean
  pristineProfileData: ViewAvatarData
  editing: boolean
  editable: boolean
  mouseOverAvatar: string | null
}

const state: PassportPopupState = {
  editing: false,
  editable: true,
  loadingProfile: true,
  savingProfile: false,
  pristineProfileData: cloneDeep(EMPTY_PROFILE_DATA),
  mouseOverAvatar: null
}
const DEFAULT_RGB = { r: 1, g: 1, b: 1, a: 1 }
/**
 * setupPassportPopup: executed one time when the explorer is initialized
 */
export function setupPassportPopup(): void {
  executeTask(async () => {
    await waitFor(() => !!getPlayer()?.userId)
    await fetchAndStoreOwnProfileData({ userId: getPlayer()?.userId ?? '' })
  })
  // When passport is open, the avatar preview is initialized and/or updated & profile data loaded
  store.subscribe((action, previousState) => {
    if (
      action.type === HUD_ACTION.PUSH_POPUP &&
      (action.payload as HUDPopup).type === HUD_POPUP_TYPE.PASSPORT
    ) {
      state.editing = false
      state.loadingProfile = true

      setAvatarPreviewCameraToWearableCategory(
        WEARABLE_CATEGORY_DEFINITIONS.body_shape.id
      )
      executeTask(async () => {
        const shownPopup = action.payload as HUDPopup
        const userId: string = shownPopup.data as string
        state.editable = userId === getPlayer()?.userId
        await fetchAndStoreOwnProfileData({ userId })
        // TODO REVIEW to refactor, profileData refers to passport profileData state, which can be own or other users, can lead to confussion and to be used as a own profile data always, refactor to useState

        state.loadingProfile = false
      })
    }
  })

  async function fetchAndStoreOwnProfileData({ userId }: { userId: string }) {
    const profileData = await fetchProfileData({ userId })
    const player: GetPlayerDataRes = getPlayer({
      userId
    }) as GetPlayerDataRes
    const [avatarData] = profileData?.avatars ?? [
      {
        ...EMPTY_PROFILE_DATA,
        hasConnectedWeb3: true,
        userId,
        avatar: {
          bodyShape: player.avatar?.bodyShapeUrn || BASE_FEMALE_URN,
          wearables: player.wearables,
          forceRender: player.forceRender ?? [],
          emotes: player.emotes,
          skin: { color: player.avatar?.skinColor ?? DEFAULT_RGB },
          eyes: { color: player.avatar?.eyesColor ?? DEFAULT_RGB },
          hair: { color: player.avatar?.hairColor ?? DEFAULT_RGB }
        }
      }
    ]
    const names = await fetchAllUserNames({ userId })
    store.dispatch(
      updateHudStateAction({
        profileData: avatarData as ViewAvatarData,
        names
      })
    )
  }
}

export const PassportPopup: Popup = ({ shownPopup }) => {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const borderRadius = getFontSize({ context: CONTEXT.DIALOG }) / 2
  const loadingAlpha = getLoadingAlphaValue()

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        zIndex: 999,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_9
      }}
      onMouseDown={() => {
        closeDialog()
      }}
    >
      <ResponsiveContent>
        <UiEntity
          uiTransform={{
            width: '80%',
            height: '100%',
            pointerFilter: 'block',
            flexDirection: 'row',
            borderRadius,
            borderWidth: 0,
            borderColor: COLOR.BLACK_TRANSPARENT
          }}
          onMouseDown={noop}
          uiBackground={{
            texture: { src: 'assets/images/passport/background.png' },
            textureMode: 'stretch'
          }}
        >
          {!state.loadingProfile
            ? [
                <UserAvatarPreviewElement
                  userId={shownPopup.data as string}
                  allowRotation={true}
                  allowZoom={false}
                  uiTransform={{
                    flexShrink: 0,
                    flexGrow: 0
                  }}
                />,
                <PassportContent />
              ]
            : null}
          {state.loadingProfile && (
            <Label
              uiTransform={{ padding: fontSize }}
              value={'Loading Avatar Passport ...'}
              fontSize={fontSize}
              color={{ ...COLOR.TEXT_COLOR_GREY, a: loadingAlpha }}
            />
          )}
          <CloseButton
            uiTransform={{
              position: {
                top: getContentScaleRatio() * 16,
                right: getContentScaleRatio() * 16
              },
              positionType: 'absolute',
              borderWidth: 0,
              borderRadius,
              borderColor: COLOR.BLACK_TRANSPARENT,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              flexGrow: 0
            }}
            onClick={() => {
              closeDialog()
            }}
          />
        </UiEntity>
      </ResponsiveContent>
    </UiEntity>
  )

  function closeDialog(): void {
    store.dispatch(closeLastPopupAction())
  }
}
const _getVisibleProperties = memoize(getVisibleProperties)
function getVisibleProperties(profileData: ViewAvatarData): string[] {
  return editablePropertyKeys.filter((key) => key && !!profileData[key])
}

function PassportContent(): ReactElement {
  const profileData = store.getState().hud.profileData
  const [player, setPlayer] = useState<GetPlayerDataRes | null>(
    getPlayer({ userId: profileData.userId })
  )
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_M
  })
  useEffect(() => {
    setPlayer(getPlayer({ userId: store.getState().hud.profileData.userId }))
  }, [store.getState().hud.profileData])
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        padding: { top: '1%' },
        flexGrow: 1
      }}
      onMouseDown={noop}
    >
      <Header>
        {NameRow({
          name: profileData.name,
          fontSize: fontSizeTitle,
          hasClaimedName: profileData.hasClaimedName
        })}
        {AddressRow({
          address: profileData.userId,
          fontSize
        })}
      </Header>
      <TabComponent
        uiTransform={{
          margin: { top: '5%' }
        }}
        tabs={[
          {
            text: 'OVERVIEW',
            active: true
          }
        ]}
        fontSize={fontSize}
      />
      <Column
        uiTransform={{
          height: getContentScaleRatio() * 1250,
          width: getContentScaleRatio() * 1700,
          overflow: 'scroll'
        }}
      >
        <Overview />
        <EquippedItemsContainer player={player} />
      </Column>
    </UiEntity>
  )
}
function Overview(): ReactElement {
  const profileData = store.getState().hud.profileData
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        margin: { top: '1%' },
        padding: '2%',
        width: '96%',
        borderRadius: fontSize / 2,
        borderColor: COLOR.TEXT_COLOR_WHITE,
        borderWidth: 0,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        opacity: state.savingProfile ? 0.5 : 1
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
    >
      {state.editable && !state.editing && (
        <ButtonIcon
          uiTransform={{
            padding: getContentScaleRatio() * 8,
            positionType: 'absolute',
            position: { right: '2%' }
          }}
          icon={{ spriteName: 'Edit', atlasName: 'icons' }}
          iconSize={getContentScaleRatio() * 40}
          backgroundColor={COLOR.WHITE_OPACITY_1}
          onMouseDown={() => {
            state.pristineProfileData = cloneDeep(profileData)
            state.editing = true
          }}
        />
      )}
      <UiEntity
        uiText={{
          value: '<b>ABOUT ME</b>',
          fontSize
        }}
      />

      <ProfilePropertyField
        uiTransform={{ width: '100%' }}
        propertyKey={'description'}
        profileData={profileData}
        editing={state.editing}
        disabled={state.savingProfile}
      />

      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          flexShrink: 1,
          flex: 1,
          flexWrap: 'wrap',
          width: '100%',
          margin: { top: '2%', bottom: '2%' },
          zIndex: 2
        }}
      >
        {!state.editing &&
          _getVisibleProperties(profileData).map(
            (propertyKey: keyof ViewAvatarData) => (
              <ProfilePropertyField
                key={propertyKey}
                uiTransform={{ width: '25%' }}
                propertyKey={propertyKey ?? ''}
                profileData={profileData}
                editing={state.editing}
                disabled={state.savingProfile}
              />
            )
          )}
        {state.editing &&
          editablePropertyKeys.map(
            (propertyKey: keyof ViewAvatarData, index) => (
              <ProfilePropertyField
                key={propertyKey}
                propertyKey={propertyKey ?? ''}
                profileData={profileData}
                editing={state.editing}
                uiTransform={{
                  zIndex: editablePropertyKeys.length + 99 - index,
                  width: '25%'
                }}
              />
            )
          )}
      </UiEntity>
      <LinksSection />

      <BottomBar />
    </UiEntity>
  )
}

function EquippedItemsContainer({
  player
}: {
  player: GetPlayerDataRes | null
}): ReactElement {
  const [wearablesData, setWearablesData] = useState<WearableEntityMetadata[]>(
    []
  )
  const [emotesData, setEmotesData] = useState<EmoteEntityMetadata[]>([])

  const canvasScaleRatio = getContentScaleRatio()
  useEffect(() => {
    if (player) {
      executeTask(async () => {
        const catalystURL =
          (await getRealm({}))?.realmInfo?.baseUrl ??
          'https://peer.decentraland.org' // TODO move catalystURL logic to fetchWearablesdata like with fetchEmotesData
        const _wearablesData = await fetchWearablesData(catalystURL)(
          ...player.wearables
            .filter((i) => i)
            .map((urn) => getURNWithoutTokenId(urn as URN))
            .filter(
              (urn): urn is URNWithoutTokenId => urn !== null && urn !== ''
            )
        )
        setWearablesData(_wearablesData as WearableEntityMetadata[])

        const _emotesData = await fetchEmotesData(
          ...((player.emotes.map((emote) =>
            getURNWithoutTokenId(emote as URN)
          ) as EquippedEmote[]) ?? [])
        )
        setEmotesData(_emotesData as EmoteEntityMetadata[])
      })

      // TODO fetchEmotesData
    }
  }, [player])
  const THUMBNAIL_SIZE = canvasScaleRatio * 228
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        margin: { top: '1%' },
        padding: '2%',
        width: '96%',
        maxWidth: '96%',
        borderRadius: fontSize / 2,
        borderColor: COLOR.TEXT_COLOR_WHITE,
        borderWidth: 0,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        opacity: state.savingProfile ? 0.5 : 1
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
    >
      <Column
        uiTransform={{
          width: '100%',
          justifyContent: 'flex-start',
          alignItems: 'flex-start'
        }}
      >
        <UiEntity
          uiText={{
            value: '<b>EQUIPPED WEARABLES</b>',
            fontSize
          }}
        />

        <Row
          uiTransform={{
            width: '100%',

            flexShrink: 0,
            flexGrow: 0,
            flexWrap: 'wrap'
          }}
        >
          {wearablesData.map((wearableData: WearableEntityMetadata) => {
            return (
              <PassportEquippedItem
                itemData={wearableData}
                thumbnailSize={THUMBNAIL_SIZE}
              />
            )
          })}
        </Row>
      </Column>
      <Column
        uiTransform={{
          width: '100%',
          justifyContent: 'flex-start',
          alignItems: 'flex-start'
        }}
      >
        <UiEntity
          uiText={{
            value: '<b>EQUIPPED EMOTES</b>',
            fontSize
          }}
        />

        <Row
          uiTransform={{
            width: '100%',

            flexShrink: 0,
            flexGrow: 0,
            flexWrap: 'wrap'
          }}
        >
          {emotesData.map((emoteData: EmoteEntityMetadata) => {
            return (
              <PassportEquippedItem
                itemData={emoteData}
                thumbnailSize={THUMBNAIL_SIZE}
              />
            )
          })}
        </Row>
      </Column>
    </UiEntity>
  )
}

function LinksSection(): ReactElement {
  const profileData = store.getState().hud.profileData
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}
    >
      {(state.editing || profileData?.links?.length >= 0) && (
        <UiEntity
          uiTransform={{
            margin: { top: '5%' }
          }}
          uiText={{
            value: '<b>LINKS</b>',
            fontSize
          }}
        />
      )}

      {state.editing && (
        <UiEntity
          uiText={{
            value:
              'Add a maximum of 5 links to promote your personal website or social networks.',
            fontSize
          }}
        />
      )}
      <UiEntity
        uiTransform={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%'
        }}
      >
        {profileData?.links?.length >= 0 &&
          profileData.links.map(
            (link: { title: string; url: string }, index: number) => (
              <ProfileLink key={link.url} link={link} editing={state.editing} />
            )
          )}
        {state.editing &&
          (!profileData.links?.length || profileData.links?.length < 5) && (
            <Button
              onMouseDown={() => {
                store.dispatch(
                  pushPopupAction({
                    type: HUD_POPUP_TYPE.ADD_LINK
                  })
                )
              }}
              disabled={state.savingProfile}
              value={'<b>+</b> ADD'}
              fontSize={fontSize}
              uiBackground={{ color: COLOR.WHITE_OPACITY_1 }}
              uiTransform={{
                borderRadius: fontSize / 2,
                borderWidth: 0,
                borderColor: COLOR.BLACK_TRANSPARENT,
                margin: { left: '2%' },
                flexShrink: 0
              }}
            />
          )}
      </UiEntity>
    </UiEntity>
  )
}
function BottomBar(): ReactElement | null {
  if (!state.editing) return null
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        width: '100%',
        padding: { top: '1%' },
        justifyContent: 'flex-end',
        zIndex: 0
      }}
    >
      <TopBorder
        color={COLOR.WHITE_OPACITY_2}
        uiTransform={{
          height: 1
        }}
      />
      <UiEntity
        uiTransform={{
          borderRadius: fontSize / 2,
          borderColor: COLOR.BLACK_TRANSPARENT,
          borderWidth: 0,
          width: getContentScaleRatio() * 180,
          margin: { right: '1%' },
          opacity: state.savingProfile || state.loadingProfile ? 0.5 : 1,
          flexShrink: 0
        }}
        uiBackground={{
          color: COLOR.WHITE_OPACITY_1
        }}
        onMouseDown={() => {
          if (state.savingProfile || state.loadingProfile) return
          state.editing = false
          store.dispatch(
            updateHudStateAction({
              profileData: cloneDeep(state.pristineProfileData)
            })
          )
        }}
        uiText={{
          value: 'CANCEL',
          fontSize,
          textWrap: 'nowrap'
        }}
      />
      <UiEntity
        uiTransform={{
          borderRadius: fontSize / 2,
          borderColor: COLOR.BLACK_TRANSPARENT,
          borderWidth: 0,
          width: getContentScaleRatio() * 180,
          flexShrink: 0,
          opacity: state.savingProfile || state.loadingProfile ? 0.5 : 1
        }}
        uiText={{
          value: 'SAVE',
          fontSize,
          textWrap: 'nowrap'
        }}
        onMouseDown={() => {
          if (state.savingProfile || state.loadingProfile) return
          executeTask(async () => {
            state.savingProfile = true
            await saveProfileData(store.getState().hud.profileData)
            state.savingProfile = false
            state.editing = false
          })
        }}
        uiBackground={{
          color: COLOR.BUTTON_PRIMARY
        }}
      />
    </UiEntity>
  )
}
function ProfileLink({
  link,
  editing
}: {
  link: { url: string; title: string }
  editing?: boolean
  key?: string
}): ReactElement {
  const profileData = store.getState().hud.profileData
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        padding: getContentScaleRatio() * 10,
        margin: getContentScaleRatio() * 10,
        borderRadius: getContentScaleRatio() * 20,
        borderColor: COLOR.BLACK_TRANSPARENT,
        borderWidth: 0,
        flexShrink: 0
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
      onMouseDown={() => {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.URL,
            data: link.url
          })
        )
      }}
    >
      <Icon
        uiTransform={{
          position: {
            top: fontSize / 2,
            left: fontSize * 0.3
          }
        }}
        icon={{
          atlasName: 'icons',
          spriteName: 'Link'
        }}
        iconSize={fontSize}
        iconColor={COLOR.LINK_BLUE}
      />
      <UiEntity
        uiText={{
          value: link.title,
          color: COLOR.LINK_BLUE,
          fontSize
        }}
      />
      {editing && (
        <ButtonIcon
          icon={{ spriteName: 'CloseIcon', atlasName: 'icons' }}
          iconSize={fontSize}
          uiBackground={{ color: COLOR.BLACK }}
          onMouseDown={() => {
            const newProfileData = cloneDeep(profileData)
            newProfileData.links = newProfileData.links.filter(
              (x) => x.url !== link.url
            )
            store.dispatch(
              updateHudStateAction({
                profileData: newProfileData
              })
            )
          }}
        />
      )}
    </UiEntity>
  )
}

function AddressRow({
  address,
  fontSize
}: {
  address: string
  fontSize: number
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center'
      }}
    >
      <UiEntity
        uiText={{
          value: applyMiddleEllipsis(address),
          fontSize,
          textAlign: 'middle-left',
          color: COLOR.INACTIVE
        }}
        uiTransform={{
          padding: 0,
          margin: { left: '-5%' }
        }}
      />
      {CopyButton({
        fontSize,
        text: address,
        elementId: 'copy-address'
      })}
    </UiEntity>
  )
}

function NameRow({
  name,
  fontSize,
  hasClaimedName
}: {
  name: string
  fontSize: number
  hasClaimedName: boolean
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center'
      }}
    >
      <StatusIcon fontSize={fontSize} />
      <UiEntity
        uiText={{
          value: name,
          fontSize,
          textAlign: 'middle-left',
          textWrap: 'nowrap'
        }}
        uiTransform={{
          alignSelf: 'flex-start',
          padding: 0,
          margin: { left: '-4%' }
        }}
      />
      {hasClaimedName && (
        <UiEntity
          uiTransform={{
            width: fontSize,
            height: fontSize,
            flexShrink: 0
          }}
          uiBackground={getBackgroundFromAtlas({
            atlasName: 'icons',
            spriteName: 'Verified'
          })}
        />
      )}
      {CopyButton({
        fontSize,
        text: name,
        elementId: 'copy-name'
      })}
      {state.editable && !state.editing && (
        <ButtonIcon
          uiTransform={{
            padding: getContentScaleRatio() * 8,
            margin: { left: '8%' }
          }}
          icon={{ spriteName: 'Edit', atlasName: 'icons' }}
          iconSize={getContentScaleRatio() * 40}
          backgroundColor={COLOR.WHITE_OPACITY_1}
          onMouseDown={() => {
            store.dispatch(
              pushPopupAction({
                type: HUD_POPUP_TYPE.NAME_EDIT,
                data: store.getState().hud.profileData.name
              })
            )
          }}
        />
      )}
    </UiEntity>
  )
}

function StatusIcon({ fontSize }: { fontSize: number }): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        width: fontSize * 0.6,
        height: fontSize * 0.6,
        borderRadius: 9999,
        borderWidth: 3 * getContentScaleRatio(),
        borderColor: COLOR.WHITE,
        flexShrink: 0,
        flexGrow: 0
      }}
      uiBackground={{ color: COLOR.STATUS_ACTIVE }} // TODO real status
    />
  )
}
function Header({ children }: { children?: ReactElement }): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}
    >
      {children}
    </UiEntity>
  )
}

// TODO refactor this file in several files
