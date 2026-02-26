import { createOrGetAvatarsTracker } from '../../service/avatar-tracker'
import {
  Billboard,
  engine,
  Material,
  MaterialTransparencyMode,
  MeshRenderer,
  PlayerIdentityData,
  Transform,
  UiCanvas,
  VisibilityComponent
} from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { AvatarAnchorPointType, AvatarAttach, type Entity } from '@dcl/ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { getTagElement } from './tag-element'
import { COLOR } from '../color-palette'
import { type GetPlayerDataRes } from '../../utils/definitions'
import { waitFor } from '../../utils/dcl-utils'
import { showErrorPopup } from '../../service/error-popup-service'
import { BevyApi } from '../../bevy-api'
import { store } from 'src/state/store'
import { updateHudStateAction } from '../../state/hud/actions'
import { type MicActivation } from '../../bevy-api/interface'
import { listenSystemAction } from '../../service/system-actions-emitter'
import { type Address } from '../../ui-classes/main-hud/chat-and-logs/named-users-data-service'

export async function initAvatarTags(): Promise<void> {
  const avatarTracker = createOrGetAvatarsTracker()
  const addressTagEntitiesMap = new Map<string, Entity>()
  const state = {
    hideNames: false
  }
  avatarTracker.onEnterScene((player) => {
    const tagEntity = createTag(player)
    if (tagEntity) {
      addressTagEntitiesMap.set(player.userId, tagEntity)
    }
  })

  avatarTracker.onLeaveScene((userId) => {
    if (addressTagEntitiesMap.has(userId)) {
      const entity: Entity = addressTagEntitiesMap.get(userId) as Entity
      engine.removeEntityWithChildren(entity)
      addressTagEntitiesMap.delete(userId)
    } else {
      showErrorPopup('WARNING: AvatarTag not found for userId: ' + userId)
      console.error('WARNING: AvatarTag not found for userId: ', userId)
    }
  })

  await waitFor(() => getPlayer() !== null)
  const player: GetPlayerDataRes = getPlayer() as GetPlayerDataRes
  const ownTagEntity = createTag(player)
  if (ownTagEntity) {
    addressTagEntitiesMap.set(player.userId, ownTagEntity)
  }

  const awaitVoiceStream = async (stream: MicActivation[]): Promise<void> => {
    for await (const voiceState of stream) {
      store.dispatch(
        updateHudStateAction({
          playerVoiceStateMap: {
            ...store.getState().hud.playerVoiceStateMap,
            [voiceState.sender_address]: voiceState.active
          }
        })
      )
    }
  }

  awaitVoiceStream(await BevyApi.getVoiceStream()).catch(console.error)

  listenSystemAction('HideNames', (pressed) => {
    if (!pressed) return
    state.hideNames = !state.hideNames
    addressTagEntitiesMap.forEach((entity) => {
      if (state.hideNames) {
        VisibilityComponent.createOrReplace(entity, { visible: false })
      } else {
        VisibilityComponent.deleteFrom(entity) // inherit
      }
    })
  })
}

function createTag(player: GetPlayerDataRes): undefined | Entity {
  let avatarEntity: Entity | undefined
  for (const [entity, data] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (data.address === player.userId) {
      avatarEntity = entity
    }
  }
  if (!avatarEntity) {
    console.log('AvatarEntity not found')
    return
  }
  const tagWrapperEntity = engine.addEntity()
  Billboard.create(tagWrapperEntity, {})
  MeshRenderer.setPlane(tagWrapperEntity)
  Transform.create(tagWrapperEntity, {
    scale: Vector3.create(2, 1, 1)
  })
  AvatarAttach.create(tagWrapperEntity, {
    avatarId: player.userId,
    anchorPointId: AvatarAnchorPointType.AAPT_NAME_TAG
  })

  UiCanvas.create(tagWrapperEntity, {
    width: 400,
    height: 200,
    color: Color4.Clear()
  })
  ReactEcsRenderer.setTextureRenderer(
    tagWrapperEntity,
    getTagElement({ userId: player.userId as Address })
  )

  Material.setPbrMaterial(tagWrapperEntity, {
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    texture: {
      tex: {
        $case: 'uiTexture',
        uiTexture: {
          uiCanvasEntity: tagWrapperEntity
        }
      }
    },
    emissiveTexture: {
      tex: {
        $case: 'uiTexture',
        uiTexture: {
          uiCanvasEntity: tagWrapperEntity
        }
      }
    },
    emissiveColor: COLOR.WHITE,
    emissiveIntensity: 0.2
  })

  return tagWrapperEntity
}
