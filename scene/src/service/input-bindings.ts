import { executeTask, InputAction } from '@dcl/sdk/ecs'
import { BevyApi } from '../bevy-api'
import { BindingsConfig, InputBinding } from '../bevy-api/interface'

export type InputBindingsMap = Record<InputAction, InputBinding>

let inputBindings: BindingsConfig | null = null
let sceneInputBindingsMap: Record<InputAction, InputBinding> | null = null //TODO REVIEW IF REFACTOR to move to redux?

export function initInputBindings() {
  executeTask(async () => {
    inputBindings = await BevyApi.getInputBindings()
    sceneInputBindingsMap = inputBindings.bindings
      .filter((b) => (b[0] as { Scene: string }).Scene)
      .reduce<Partial<Record<InputAction, InputBinding>>>((acc, current) => {
        acc[inputActionStrNum[(current[0] as { Scene: string }).Scene]] =
          current[1][0]
        return acc
      }, {}) as Record<InputAction, InputBinding>
  })
}

export function getInputBindings() {
  return inputBindings
}

export function getSceneInputBindingsMap() {
  return sceneInputBindingsMap
}

const inputActionStrNum: { [key: string]: InputAction } = {
  IaPointer: 0,
  IaPrimary: 1,
  IaSecondary: 2,
  IaForward: 3,
  IaRight: 4,
  IaLeft: 5,
  IaJump: 6,
  IaWalk: 7
}
