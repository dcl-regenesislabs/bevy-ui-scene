import { BevyApi } from '../bevy-api'
import type { ExplorerSetting } from '../bevy-api/interface'
import { GameController } from '../controllers/game.controller'
import { loadSettingsFromExplorer } from '../state/settings/actions'
import { store } from '../state/store'
import { executeTask } from '@dcl/sdk/ecs'
import { sleep } from '../utils/dcl-utils'

let gameInstance: GameController

export async function init(retry: boolean): Promise<void> {
  gameInstance = new GameController()

  gameInstance.uiController.loadingAndLogin.startLoading()

  // BevyApi.loginGuest()
  // gameInstance.uiController.loadingAndLogin.finishLoading()
  // gameInstance.uiController.menu?.show('settings')
  executeTask(async () => {
    await sleep(100)
    // store.dispatch(updateHudStateAction({ loggedIn: true }))
    // gameInstance.uiController.menu?.show('backpack')
    // store.dispatch(updateHudStateAction({ realmURL: (await getRealm({})).realmInfo!.baseUrl}))
    /*    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.NOTIFICATIONS_MENU
      })
    ) */
    /*    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.ERROR,
        data: 'This is the error description'
      })
    ) */

    /*    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.PROFILE_MENU,
        data: getPlayer()?.userId
      })
    ) */
    /*    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.PASSPORT,
        data: `0x598f8af1565003AE7456DaC280a18ee826Df7a2c` // 0x4b538e1e044922aec2f428ec7e17a99f44205ff9 , 0x598f8af1565003AE7456DaC280a18ee826Df7a2c , 0x235ec1cc12dbda96f014896de38f74f6e60239c0
      })
    ) */
    /*   store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.ADD_LINK
      })
    ) */
    /*
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.NAME_EDIT
      })
    ) */
  })

  const { description, url } = await BevyApi.checkForUpdate()

  if (url !== '') {
    console.log('There is a new update', description, url)
  } else {
    console.log('No update available')
  }
  const { message } = await BevyApi.messageOfTheDay()
  if (message !== '') {
    gameInstance.uiController.warningPopUp.tittle = 'Message of the day:'
    gameInstance.uiController.warningPopUp.message = message
    gameInstance.uiController.warningPopUp.icon = 'DdlIconColor'
    gameInstance.uiController.warningPopUp.show()
  }

  const settingsArray = await BevyApi.getSettings()
  if (settingsArray.length === 0) {
    console.log('No settings found')
  } else {
    console.log('Settings found: ', settingsArray.length)
  }

  const explorerSettings = settingsArray.reduce(
    (acc: Record<string, ExplorerSetting>, setting) => {
      acc[setting.name] = setting
      return acc
    },
    {}
  )
  store.dispatch(loadSettingsFromExplorer(explorerSettings))

  const previousLogin = await BevyApi.getPreviousLogin()

  if (previousLogin.userId !== null && previousLogin.userId !== undefined) {
    gameInstance.uiController.loadingAndLogin.setStatus('reuse-login-or-new')
  } else {
    gameInstance.uiController.loadingAndLogin.setStatus('sign-in-or-guest')
  }
}
