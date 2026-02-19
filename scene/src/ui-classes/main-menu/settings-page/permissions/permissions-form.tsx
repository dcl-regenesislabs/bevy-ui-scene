import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type PermissionDefinition } from '../../../../bevy-api/permission-definitions'
import { getContentScaleRatio } from '../../../../service/canvas-ratio'
import { Column, Row } from '../../../../components/layout'
import { COLOR } from '../../../../components/color-palette'

import { noop } from '../../../../utils/function-utils'
import { ResponsiveContent } from '../../backpack-page/BackpackPage'
import { DropdownComponent } from '../../../../components/dropdown-component'
import useState = ReactEcs.useState
import { BevyApi } from '../../../../bevy-api'
import { executeTask } from '@dcl/sdk/ecs'
import {
  filterSelectableScenes,
  getCurrentScene
} from '../../../../service/player-scenes'
import {
  getCompletePermissionsMatrix,
  type PermissionResult
} from '../permissions-map'
import { PermissionLegend } from './permission-legend'
import { PermissionRowField } from './permission-row-field'
import { getRealm } from '~system/Runtime'
import useEffect = ReactEcs.useEffect
import { type InputOption } from '../../../../utils/definitions'
import {
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../../service/fontsize-system'

export const PermissionsForm = ({
  permissionDefinitions
}: {
  permissionDefinitions: PermissionDefinition[]
}): ReactElement | null => {
  const [loading, setLoading] = useState(true)
  const [hoveredPermission, setHoveredPermission] = useState<string | null>(
    null
  )
  const hoveredPermissionDefinition = hoveredPermission
    ? permissionDefinitions.find((p) => p.permissionType === hoveredPermission)
    : null
  const FONTSIZE_SMALL = getFontSize({})
  const FONTSIZE_BIG = getFontSize({ token: TYPOGRAPHY_TOKENS.TITLE_L })
  const FONTSIZE_MEDIUM = getFontSize({ token: TYPOGRAPHY_TOKENS.TITLE_M })

  const [sceneOptions, setSceneOptions] = useState<InputOption[]>([
    { label: '', value: null }
  ])
  const [selectedScene, setSelectedSceneHash] = useState<string | null>(null)
  const onPermissionMouseLeave = (permissionType: string): void => {
    if (!(hoveredPermission && hoveredPermission !== permissionType)) {
      setHoveredPermission(null)
    }
  }
  const [sceneHash, setSceneHash] = useState<string>('')
  const [realmURL, setRealmURL] = useState<string>('')
  const [permissionsResults, setPermissionsResults] = useState<Record<
    string,
    PermissionResult
  > | null>(null)
  const [changes, setChanges] = useState<number>(0)

  useEffect(() => {
    executeTask(async () => {
      const liveSceneInfo = (await BevyApi.liveSceneInfo()).filter(
        filterSelectableScenes
      )
      const playerScene = await getCurrentScene(liveSceneInfo)
      setSceneOptions(
        liveSceneInfo.map((sceneInfo) => ({
          label: sceneInfo.title,
          value: sceneInfo.hash
        }))
      )
      const selectedSceneItem =
        selectedScene === null
          ? playerScene
          : liveSceneInfo.find((s) => s.hash === selectedScene)

      if (selectedSceneItem) {
        setSelectedSceneHash(selectedSceneItem.hash)
        setSceneHash(selectedSceneItem.hash)
      }

      const { realmInfo } = await getRealm({})

      setRealmURL(realmInfo?.baseUrl ?? 'main') // TODO REVIEW

      const completePermissionsMatrix = await getCompletePermissionsMatrix(
        selectedSceneItem?.hash
      )

      setPermissionsResults(completePermissionsMatrix)
      setLoading(false)
    })
  }, [changes])

  const onChangeRow = (): void => {
    setChanges(changes + 1)
  }

  if (!permissionsResults || loading) return null
  return (
    <ResponsiveContent>
      <UiEntity
        uiTransform={{
          width: '80%',
          height: '100%',
          pointerFilter: 'block',
          flexDirection: 'row',
          borderRadius: getContentScaleRatio() * 50,
          borderWidth: 0,
          borderColor: COLOR.BLACK_TRANSPARENT,
          margin: { top: '1%' }
        }}
        onMouseDown={noop}
        uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
      >
        <Column
          uiTransform={{
            width: '60%',
            margin: { left: '2%', top: '1%' }
          }}
        >
          <Row
            uiTransform={{
              alignItems: 'center',
              justifyContent: 'flex-start',
              margin: { bottom: '3%' },
              zIndex: 2
            }}
          >
            <UiEntity
              uiTransform={{ alignSelf: 'center', position: { top: '13%' } }}
              uiText={{
                value: 'Permissions Selected Scene',
                fontSize: FONTSIZE_MEDIUM,
                textAlign: 'middle-center'
              }}
            />
            <DropdownComponent
              uiTransform={{
                width: getContentScaleRatio() * 400,
                alignSelf: 'center'
              }}
              listMaxHeight={getContentScaleRatio() * 1000}
              scroll={true}
              options={sceneOptions}
              value={selectedScene}
              onChange={(value) => {
                setSelectedSceneHash(value)
                setLoading(true)
                setChanges(changes + 1)
              }}
            />
          </Row>
          <Column
            uiTransform={{
              width: '100%',
              height: getContentScaleRatio() * 1300,
              overflow: 'scroll',
              scrollVisible: 'vertical'
            }}
          >
            {permissionDefinitions.map((permissionDefinition, index) => {
              return [
                permissionDefinitions[index - 1]?.section !==
                  permissionDefinition.section && (
                  <UiEntity
                    key={permissionDefinition.permissionType}
                    uiText={{
                      value: `<b>${permissionDefinition.section}</b>`,
                      fontSize: FONTSIZE_BIG,
                      textAlign: 'middle-left',
                      textWrap: 'nowrap'
                    }}
                    uiTransform={{ width: '96%', alignItems: 'center' }}
                    uiBackground={{
                      color: COLOR.DARK_OPACITY_2
                    }}
                  >
                    <UiEntity
                      uiTransform={{
                        positionType: 'absolute',
                        position: { left: '48%' },
                        alignItems: 'stretch',
                        width: '42%'
                      }}
                    >
                      <UiEntity
                        uiTransform={{
                          width: '33%'
                        }}
                        uiText={{
                          textWrap: 'wrap',
                          value: 'Selected Scene',
                          fontSize: FONTSIZE_SMALL,
                          textAlign: 'middle-center',
                          color: COLOR.WHITE_OPACITY_5
                        }}
                      />
                      <UiEntity
                        uiTransform={{
                          width: '33%'
                        }}
                        uiText={{
                          textWrap: 'wrap',
                          value: 'Current Realm',
                          fontSize: FONTSIZE_SMALL,
                          textAlign: 'middle-center',
                          color: COLOR.WHITE_OPACITY_5
                        }}
                      />
                      <UiEntity
                        uiTransform={{
                          width: '33%'
                        }}
                        uiText={{
                          textWrap: 'wrap',
                          value: 'Default',
                          fontSize: FONTSIZE_SMALL,
                          textAlign: 'middle-center',
                          color: COLOR.WHITE_OPACITY_5
                        }}
                      />
                    </UiEntity>
                  </UiEntity>
                ),
                <PermissionRowField
                  onMouseEnter={() => {
                    setHoveredPermission(permissionDefinition.permissionType)
                  }}
                  onMouseLeave={() => {
                    onPermissionMouseLeave(permissionDefinition.permissionType)
                  }}
                  permissionDefinition={permissionDefinition}
                  value={
                    permissionsResults[permissionDefinition.permissionType]
                  }
                  sceneHash={sceneHash}
                  realmURL={realmURL}
                  onChange={onChangeRow}
                />
              ].filter((i) => i)
            })}
          </Column>
        </Column>
        {hoveredPermission && (
          <Column>
            <UiEntity
              uiText={{
                value: hoveredPermissionDefinition
                  ? hoveredPermissionDefinition.label
                  : '',
                fontSize: FONTSIZE_BIG,
                textAlign: 'top-left'
              }}
              uiTransform={{ padding: { top: '5%' } }}
            />
            <UiEntity
              uiText={{
                value: hoveredPermissionDefinition
                  ? `This permission is requested when scene attempts to ${hoveredPermissionDefinition.activeDescription}`
                  : '',
                fontSize: FONTSIZE_MEDIUM,
                textAlign: 'top-left',
                color: COLOR.TEXT_COLOR_LIGHT_GREY
              }}
              uiTransform={{ padding: { top: '5%' } }}
            />
            <PermissionLegend />
          </Column>
        )}
        {!hoveredPermission && (
          <Column>
            <UiEntity
              uiText={{
                value: 'Permissions',
                fontSize: FONTSIZE_BIG,
                textAlign: 'top-left'
              }}
              uiTransform={{ padding: { top: '5%' } }}
            />
            <UiEntity
              uiText={{
                value: `Choose how scenes can interact with your app. For each request, you can allow it, deny it, ask every time, or use your global preference\n`,
                fontSize: FONTSIZE_MEDIUM,
                textAlign: 'top-left',
                color: COLOR.TEXT_COLOR_LIGHT_GREY
              }}
              uiTransform={{ padding: { top: '5%', bottom: '10%' } }}
            />
            <PermissionLegend />
          </Column>
        )}
      </UiEntity>
    </ResponsiveContent>
  )
}
