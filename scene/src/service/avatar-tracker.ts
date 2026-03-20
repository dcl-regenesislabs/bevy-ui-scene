import {
  engine,
  type Entity,
  Transform,
  pointerEventsSystem,
  InputAction,
  type PBPointerEventsResult,
  PlayerIdentityData,
  executeTask
} from '@dcl/sdk/ecs'
import { onEnterScene, onLeaveScene, getPlayer } from '@dcl/sdk/players'
import { BevyApi } from '../bevy-api'
import {
  type PBAvatarBase,
  type PBAvatarEquippedData,
  type PBPlayerIdentityData
} from '@dcl/ecs/dist/components'
import { type TransformType } from '@dcl/ecs'

type GetPlayerDataRes = {
  entity: Entity
  name: string
  isGuest: boolean
  userId: string
  avatar?: PBAvatarBase
  wearables: PBAvatarEquippedData['wearableUrns']
  emotes: PBAvatarEquippedData['emoteUrns']
  forceRender: PBAvatarEquippedData['forceRender']
  position: TransformType['position'] | undefined
}
export type UserIdCallback = (userId: string) => void
export type PlayerCallback = (player: GetPlayerDataRes) => void
export type UnListenFn = () => void
export type AvatarTracker = {
  onClick: (fn: UserIdCallback) => UnListenFn
  onEnterScene: (fn: PlayerCallback) => UnListenFn
  onLeaveScene: (fn: UserIdCallback) => UnListenFn
  isProfileBlocked: (userId: string) => boolean
  dispose: () => void
}

let avatarTracker: AvatarTracker

export const createOrGetAvatarsTracker = (): AvatarTracker => {
  if (avatarTracker !== undefined) return avatarTracker

  const callbacks: Record<string, Array<PlayerCallback | UserIdCallback>> = {
    // TODO dont use record , specify type for each
    onClick: [],
    onEnterScene: [],
    onLeaveScene: []
  }
  const avatarProxies = new Map<string, Entity>()
  const blockedProfiles = new Set<string>()

  for (const [playerEntity, data] of engine.getEntitiesWith(
    PlayerIdentityData
  )) {
    const playerIdentity: PBPlayerIdentityData = data
    if (
      !avatarProxies.has(playerIdentity.address) &&
      playerIdentity.address !== getPlayer()?.userId
    ) {
      const proxy = createAvatarProxy(
        playerIdentity.address,
        playerEntity
      )
      avatarProxies.set(playerIdentity.address, proxy)
    }
  }

  onEnterScene((player) => {
    if (player.userId === getPlayer()?.userId) {
      return
    }
    let playerEntity
    for (const [_playerEntity, data] of engine.getEntitiesWith(
      PlayerIdentityData
    )) {
      if (data.address === player.userId) {
        playerEntity = _playerEntity
      }
    }

    if (!avatarProxies.has(player.userId) && playerEntity) {
      const proxy = createAvatarProxy(
        player.userId,
        playerEntity
      )
      avatarProxies.set(player.userId, proxy)
    }
    callbacks.onEnterScene.forEach((fn) => {
      ;(fn as PlayerCallback)(player)
    })
  })

  onLeaveScene(onLeaveSceneCallback)

  function onLeaveSceneCallback(userId: string): void {
    const proxy = avatarProxies.get(userId)
    if (proxy) {
      pointerEventsSystem.removeOnPointerDown(proxy)
      pointerEventsSystem.removeOnPointerHoverEnter(proxy)
      pointerEventsSystem.removeOnPointerHoverLeave(proxy)
      engine.removeEntityWithChildren(proxy)

      avatarProxies.delete(userId)
    }
    callbacks.onLeaveScene.forEach((fn) => {
      ;(fn as UserIdCallback)(userId)
    })
  }

  let timer = 0
  engine.addSystem((dt) => {
    timer += dt
    if (timer < 0.2) return
    timer = 0
    for (const [userId, proxyEntity] of avatarProxies.entries()) {
      const playerData: GetPlayerDataRes | null = getPlayer({ userId })
      if (playerData?.position) {
        const transform = Transform.getMutable(proxyEntity)
        transform.position = playerData.position
      }
    }
  })

  let modifierTimer = 0
  engine.addSystem((dt) => {
    modifierTimer += dt
    if (modifierTimer < 1.0) return
    modifierTimer = 0
    executeTask(async () => {
      const modifiers = await BevyApi.getAvatarModifiers()
      const newBlocked = new Set<string>()
      for (const entry of modifiers) {
        if (entry.hideProfile) {
          newBlocked.add(entry.userId)
        }
      }

      for (const [userId, entity] of avatarProxies.entries()) {
        const wasBlocked = blockedProfiles.has(userId)
        const isBlocked = newBlocked.has(userId)
        if (wasBlocked !== isBlocked) {
          pointerEventsSystem.removeOnPointerDown(entity)
          registerPointerDown(userId, entity, isBlocked)
        }
      }

      blockedProfiles.clear()
      for (const id of newBlocked) {
        blockedProfiles.add(id)
      }
    })
  })

  avatarTracker = {
    onClick,
    dispose,
    isProfileBlocked: (userId: string) => blockedProfiles.has(userId),
    onEnterScene: (fn: PlayerCallback) => {
      callbacks.onEnterScene.push(fn)
      return () => {
        callbacks.onEnterScene = callbacks.onEnterScene.filter((f) => f !== fn)
      }
    },
    onLeaveScene: (fn: UserIdCallback) => {
      callbacks.onLeaveScene.push(fn)
      return () => {
        callbacks.onLeaveScene = callbacks.onLeaveScene.filter((f) => f !== fn)
      }
    }
  }
  return avatarTracker

  function dispose(): void {
    ;[...avatarProxies.keys()].forEach((userId) => {
      onLeaveSceneCallback(userId)
    })
    callbacks.onClick = callbacks.onMouseOver = callbacks.onMouseLeave = []
  }

  function onClick(fn: (userId: string) => void): () => void {
    callbacks.onClick.push(fn)
    return () => {
      callbacks.onClick = callbacks.onClick.filter((f) => f !== fn)
    }
  }

  function registerPointerDown(
    userId: string,
    entity: Entity,
    blocked: boolean
  ): void {
    pointerEventsSystem.onPointerDown(
      {
        entity,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: blocked ? undefined : 'Show Profile',
          showFeedback: !blocked
        }
      },
      (_event: PBPointerEventsResult) => {
        callbacks.onClick.forEach((fn) => {
          ;(fn as UserIdCallback)(userId)
        })
      }
    )
  }

  function createAvatarProxy(
    userId: string,
    playerEntity: Entity
  ): Entity {
    registerPointerDown(userId, playerEntity, false)
    return playerEntity
  }
}

export function getPlayerAvatarEntities(includeSelf?: boolean): Entity[] {
  const entities = []
  for (const [entity, data] of engine.getEntitiesWith(PlayerIdentityData)) {
    if (includeSelf || data.address !== getPlayer()?.userId) {
      entities.push(entity)
    }
  }
  return entities
}
