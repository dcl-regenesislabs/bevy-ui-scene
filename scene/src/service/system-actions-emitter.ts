import type { SystemAction } from '../bevy-api/interface'
import { sleep } from '../utils/dcl-utils'
import { BevyApi } from '../bevy-api'
import { createMediator } from '../utils/function-utils'

const systemActionsEmitter = createMediator()

export function listenSystemAction(
  action: string,
  fn: (...args: any[]) => void
): () => void {
  systemActionsEmitter.subscribe(action, fn)

  return (): void => {
    unlistenSystemAction(action, fn)
  }
}

export function unlistenSystemAction(
  action: string,
  fn: (...args: any[]) => void
): void {
  systemActionsEmitter.unsubscribe(action, fn)
}

export function initSystemActionsEmitter(): void {
  listen().catch(console.error)

  async function listen(): Promise<void> {
    await sleep(0)
    awaitStream(await BevyApi.getSystemActionStream()).catch(console.error)
  }

  async function awaitStream(stream: SystemAction[]): Promise<void> {
    for await (const actionInfo of stream) {
      systemActionsEmitter.publish(actionInfo.action, actionInfo.pressed)
      console.log('actionInfo', actionInfo)
    }
  }
}
