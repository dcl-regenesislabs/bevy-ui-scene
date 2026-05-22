import { executeTask } from '@dcl/sdk/ecs'
import { sleep } from '../utils/dcl-utils'
import { getRealm } from '~system/Runtime'
import { LOCAL_PREVIEW_REALM_NAME } from '../utils/constants'

const INTERVAL_TO_TRIGGER_REALM_CHANGE_MS = 2000

type RealmChangeCallback = (provider: string, previous?: string) => void

const state: { base: string; isWorld: boolean; realmName: string } = {
  base: '',
  realmName: '',
  isWorld: false
}

const callbacks: { onChange: RealmChangeCallback[] } = {
  onChange: []
}

export function onChangeRealmProvider(fn: RealmChangeCallback): () => void {
  callbacks.onChange.push(fn)
  return () => {
    const idx = callbacks.onChange.indexOf(fn)
    if (idx !== -1) callbacks.onChange.splice(idx, 1)
  }
}

export function initRealmProviderChangeListener(): void {
  executeTask(async () => {
    while (true) {
      try {
        await sleep(INTERVAL_TO_TRIGGER_REALM_CHANGE_MS)
        const { realmInfo } = await getRealm({})
        const base = realmInfo?.baseUrl ?? ''
        const name = realmInfo?.realmName ?? ''
        const latest = base
        const onWorld =
          base.includes('worlds-content-server') ||
          /\.dcl\.eth$/.test(name) ||
          name.endsWith('.eth')

        const prev = state.base
        state.base = latest
        state.isWorld = onWorld
        state.realmName = name

        if (prev !== state.base) {
          for (const cb of callbacks.onChange) {
            try {
              cb(latest, prev || undefined)
            } catch (err) {
              console.error('onChangeRealmProvider callback error', err)
            }
          }
        }
      } catch (error) {
        console.log('Error XXXXXXXXXXXXXX', error)
      }
    }
  })
}

export function currentRealmProviderIsWorld(): boolean {
  return state.isWorld
}
export function currentRealmProviderIsPreview(): boolean {
  return state.realmName === LOCAL_PREVIEW_REALM_NAME
}
export function getRealmName(): string {
  return state.realmName
}
