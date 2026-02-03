import { executeTask, InputAction } from '@dcl/sdk/ecs'
import { BevyApi } from '../bevy-api'
import { type BindingsConfig, type InputBinding } from '../bevy-api/interface'

export type InputBindingsMap = Record<InputAction, InputBinding>

let inputBindings: BindingsConfig | null = null
let sceneInputBindingsMap: Record<InputAction, InputBinding> | null = null // TODO REVIEW IF REFACTOR to move to redux?

export function initInputBindings(): void {
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

export function getInputBindings(): BindingsConfig | null {
  return inputBindings
}

export function getSceneInputBindingsMap(): Record<
  InputAction,
  InputBinding
> | null {
  return sceneInputBindingsMap
}

const inputActionStrNum: Record<string, InputAction> = {
  IaPointer: InputAction.IA_POINTER,
  IaPrimary: InputAction.IA_PRIMARY,
  IaSecondary: InputAction.IA_SECONDARY,

  IaAny: InputAction.IA_ANY,

  IaForward: InputAction.IA_FORWARD,
  IaBackward: InputAction.IA_BACKWARD,
  IaRight: InputAction.IA_RIGHT,
  IaLeft: InputAction.IA_LEFT,

  IaJump: InputAction.IA_JUMP,
  IaWalk: InputAction.IA_WALK,

  IaAction3: InputAction.IA_ACTION_3,
  IaAction4: InputAction.IA_ACTION_4,
  IaAction5: InputAction.IA_ACTION_5,
  IaAction6: InputAction.IA_ACTION_6
}
