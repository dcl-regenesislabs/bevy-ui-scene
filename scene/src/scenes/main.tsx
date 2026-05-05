import { BevyApi } from '../bevy-api'
import type { ExplorerSetting } from '../bevy-api/interface'
import { GameController } from '../controllers/game.controller'
import { initFeatureFlags } from '../service/feature-flags'
import { loadSettingsFromExplorer } from '../state/settings/actions'
import { store } from '../state/store'
import { executeTask } from '@dcl/sdk/ecs'
import { sleep, waitFor } from '../utils/dcl-utils'
import { getPlayer } from '@dcl/sdk/players'

let gameInstance: GameController

export async function init(retry: boolean): Promise<void> {
  await initFeatureFlags()
  gameInstance = new GameController()

  gameInstance.uiController.loadingAndLogin.startLoading()
  // BevyApi.loginGuest()
  // gameInstance.uiController.loadingAndLogin.finishLoading()

  executeTask(async () => {
    await sleep(100)
    await waitFor(() => !!getPlayer())

    // store.dispatch(updateHudStateAction({ loggedIn: true }))
    // gameInstance.uiController.menu?.show('settings')
    // gameInstance.uiController.menu?.show('communities')
    /* store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.COMMUNITY_PLACE_INFO,
        data: {
          id: '5a44fd77-2e71-4e96-8488-6798eb2e3e77',
          title: 'Music Festival Main Stage',
          description: 'Join us on the main stage of Decentraland Music Festival',
          image:
            'https://peer.decentraland.org/content/contents/bafybeicas543bajwgkvklwdx3ovewnw7jyabwibd2mxgjmwnnp6zntmlpe',
          owner: null,
          world_name: null,
          content_rating: 'RP',
          categories: [],
          likes: 3,
          dislikes: 0,
          favorites: 5,
          like_rate: 1,
          like_score: 0.34237194,
          disabled: false,
          disabled_at: null,
          created_at: '2025-10-13T09:53:08.578Z',
          updated_at: '2025-10-13T09:53:08.578Z',
          base_position: '-66,-56',
          contact_name: 'SDK',
          deployed_at: '2025-12-04T14:12:59.960Z',
          highlighted: false,
          world: false,
          is_private: false,
          highlighted_image: null,
          positions: [
            '-58,-52', '-58,-53', '-58,-54', '-58,-55', '-58,-56',
            '-59,-52', '-59,-53', '-59,-54', '-59,-55', '-59,-56',
            '-60,-52', '-60,-53', '-60,-54', '-60,-55', '-60,-56',
            '-61,-52', '-61,-53', '-61,-54', '-61,-55', '-61,-56',
            '-62,-52', '-62,-53', '-62,-54', '-62,-55', '-62,-56',
            '-63,-52', '-63,-53', '-63,-54', '-63,-55', '-63,-56',
            '-64,-52', '-64,-53', '-64,-54', '-64,-55', '-64,-56',
            '-65,-52', '-65,-53', '-65,-54', '-65,-55', '-65,-56',
            '-66,-52', '-66,-53', '-66,-54', '-66,-55', '-66,-56'
          ],
          contact_email: null,
          creator_address: null,
          sdk: null,
          ranking: 0,
          user_visits: 101,
          user_favorite: false,
          user_like: false,
          user_dislike: false,
          user_count: 0
        }
      })
    ) */
    /* store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.COMMUNITY_VIEW,
        data: {
          id: 'e99471aa-31c4-4952-abf6-99905445f43b',
          name: 'Decentraland Foundation',
          description:
            'Your hub for official Decentraland updates and events.\n\nKeep up with All Hands, Art Week, Music Festival, Fashion Week, workshops, and more—all in one place.',
          ownerAddress: '0xbcac4dafb7e215f2f6cb3312af6d5e4f9d9e7eda',
          role: 'member',
          privacy: 'public',
          visibility: 'all',
          active: true,
          membersCount: 1159,
          friends: [
            {
              address: '0x082f2a8ea1d8e3ee24c20d12452b7e851ad0d5dd',
              name: 'StoneyEye',
              nameColor: {
                a: 1,
                b: 0.2688266,
                g: 1,
                r: 0.250980377
              },
              hasClaimedName: true,
              profilePictureUrl:
                'https://profile-images.decentraland.org/entities/bafkreid5btlh76opew65hxu6dtkdo6ybqhymdof6vrrmjy2p5a74oy4huq/face.png'
            },
            {
              address: '0x0d2d5a968127d3fea9dc5032c78724620980a62d',
              name: 'dclchess',
              hasClaimedName: true,
              profilePictureUrl:
                'https://profile-images.decentraland.org/entities/bafkreie5bpho47gnh3jrfxoezwc4pxffup4cmmhmdxsmpf3oslopxb4enm/face.png'
            },
            {
              address: '0x10cc5a90c81f7645597e49605af04278974bc7f6',
              name: 'MastaWainzz',
              nameColor: {
                a: 1,
                b: 1,
                g: 0.5562167,
                r: 0.25
              },
              hasClaimedName: true,
              profilePictureUrl:
                'https://profile-images.decentraland.org/entities/bafkreig4xay5oxgbf75hwkjefx5hgdcdvm6a4tnpiisltslxf4jtajkbyq/face.png'
            }
          ],
          ownerName: 'DCLOfficial',
          voiceChatStatus: {
            isActive: false,
            participantCount: 0,
            moderatorCount: 0
          }
        }
      })
    ) */
    /*
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.COMMUNITY_EVENT_INFO,
        data: {
          id: '11974ff3-675c-46fd-802a-618d4b40e3be',
          name: 'Build Your Career with Career Mondays',
          image:
            'https://events-assets-099ac00.decentraland.org/poster/b9c4b26369c6693c.jpg',
          image_vertical:
            'https://events-assets-099ac00.decentraland.org/poster-vertical/b9c4b26369c15b87.jpg',
          description:
            "Join us every Monday at the Decentraland Theatre as partners including Metana and Bondex share what's actually working in AI, Web3, and emerging tech: how people are getting hired, what skills are worth building, and where things are heading. Each session runs 40 to 60 minutes and features a different partner, so the perspective shifts week to week.\n\nIf you're trying to break into one of these fields, or already working in them and trying to stay current, it's a practical place to spend an hour on a Monday.\n\nApril 20:\n\n🎯 Careers at Decentraland: Support & Product Stories\n\nStoyan (Head of Support) and Nico (former Product Manager) share their journeys, what it takes to keep the platform running smoothly, and how product decisions come to life behind the scenes. Real experiences from different sides of the team, with lessons you can take into your own path.",
          start_at: '2026-03-23T14:00:00.000Z',
          finish_at: '2026-05-04T15:00:00.000Z',
          coordinates: [0, 5],
          position: [0, 5],
          x: 0,
          y: 5,
          user: '0x1e105bb213754519903788022b962fe2b9c4b263',
          user_name: 'Decentraland Foundation',
          approved: true,
          rejected: false,
          created_at: '2026-03-27T11:26:00.276Z',
          updated_at: '2026-04-20T13:58:21.728Z',
          total_attendees: 18,
          latest_attendees: [
            '0x598f8af1565003ae7456dac280a18ee826df7a2c',
            '0x70eefd71838f891e9d2abd9020cacbbd00fa747e',
            '0xf651d7cc304e41dd41d72bcbe3292ac752fb718c',
            '0xb81e27ee524e68966c9c7cd4b172ac3e9528f118',
            '0xf6dbe40181f701df62c680b94e6806105173ba5f',
            '0x91ca46d903fc79c22d572f29445546114dbbe731',
            '0x877d30cad2746538b03061cd345b3e3eb1c3b748',
            '0x084c2cde5d736e0b0295771947ca02531b242df3',
            '0xf605e3257c5662406b8baa9e6040dc393d05922f',
            '0xa737abb7f98ff5f73285a19eab3e359ff867db73'
          ],
          url: 'https://decentraland.org/jump/events?position=0%2C5',
          scene_name: 'Genesis Plaza',
          estate_id: '1164',
          estate_name: 'Genesis Plaza',
          all_day: false,
          recurrent: true,
          recurrent_frequency: 'WEEKLY',
          recurrent_weekday_mask: 2,
          recurrent_month_mask: 0,
          recurrent_interval: 1,
          recurrent_count: null,
          recurrent_until: '2026-05-06T00:00:00.000Z',
          recurrent_dates: [
            '2026-03-23T14:00:00.000Z',
            '2026-04-20T14:00:00.000Z',
            '2026-04-27T14:00:00.000Z',
            '2026-05-04T14:00:00.000Z'
          ],
          duration: 3600000,
          next_start_at: '2026-04-20T14:00:00.000Z',
          next_finish_at: '2026-04-20T15:00:00.000Z',
          categories: ['talks'],
          schedules: [],
          approved_by: '0x1e105bb213754519903788022b962fe2b9c4b263',
          rejected_by: null,
          world: false,
          place_id: '3ca25728-5b41-48f6-8e24-5cb0e3f2bb5d',
          previous_place_id: null,
          community_id: 'e99471aa-31c4-4952-abf6-99905445f43b',
          attending: true,
          live: true,
          highlighted: false,
          trending: false,
          server: null
        }
      })
    ) */
    // store.dispatch(updateHudStateAction({ realmURL: (await getRealm({})).realmInfo!.baseUrl}))
    /*  store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.URL,
        data: 'https://google.es'
      })
    ) */
    /*   store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.ERROR,
        data: '0,0'
      })
    ) */
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
    /* store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.PASSPORT,

        data: `0x598f8af1565003AE7456DaC2¡80a18ee826Df7a2c` // 0x4b538e1e044922aec2f428ec7e17a99f44205ff9 , 0x598f8af1565003AE7456DaC280a18ee826Df7a2c , 0x235ec1cc12dbda96f014896de38f74f6e60239c0
      })
    ) */
    /* store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.ADD_LINK
      })
    ) */
    /* store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.NAME_EDIT,
        data: 'pablo'
      })
    ) */
    /* store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.NOTIFICATIONS_MENU
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
