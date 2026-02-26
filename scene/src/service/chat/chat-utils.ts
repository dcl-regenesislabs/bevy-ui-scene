import type { ChatMessageRepresentation } from '../../components/chat/chat-message/ChatMessage.types'
import {
  type Address,
  asyncHasClaimedName,
  composedUsersData,
  namedUsersData,
  nameString
} from '../../ui-classes/main-hud/chat-and-logs/named-users-data-service'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import {
  decorateMessageWithLinks,
  NAME_MENTION_REGEXP
} from '../../components/chat/chat-message/ChatMessage'
import { getPlayersInScene } from '~system/Players'
import { getPlayer } from '@dcl/sdk/players'
import { setIfNot } from '../../utils/function-utils'

import { GetPlayerDataRes } from '../../utils/definitions'
import { fetchProfileData } from '../../utils/passport-promise-utils'

export async function extendMessageMentionedUsers(
  message: ChatMessageRepresentation
): Promise<void> {
  const mentionMatches = message._originalMessage.match(NAME_MENTION_REGEXP)
  const mentionMatchesAndSenderName = [...(mentionMatches ?? []), message.name]

  const playersInScene = (await getPlayersInScene({})).players.map(
    ({ userId }) => getPlayer({ userId })
  )

  for (const mentionMatchOrSenderName of mentionMatchesAndSenderName ?? []) {
    const nameKey = mentionMatchOrSenderName.replace('@', '').toLowerCase()
    const nameAddress = namedUsersData.get(nameKey)
    const composedUserData = setIfNot(composedUsersData).get(
      nameAddress ?? '__NOTHING__'
    )

    for (const player of playersInScene) {
      if (
        player !== undefined &&
        nameKey ===
          (getNameWithHashPostfix(
            player?.name ?? '',
            player?.userId ?? ''
          )?.toLowerCase() ?? '')
      ) {
        composedUserData.playerData = getPlayer({
          userId: player?.userId ?? ''
        })
        if (player?.userId) {
          namedUsersData.set(
            getNameWithHashPostfix(
              player?.name ?? '',
              player?.userId ?? ''
            )?.toLowerCase() ?? '',
            player.userId as Address
          )
        }
        await checkProfileData(nameKey, player)
      } else if (
        player !== undefined &&
        nameKey === player?.name.toLowerCase()
      ) {
        composedUserData.playerData = player
        await checkProfileData(nameKey, player)
      }

      async function checkProfileData(
        nameKey: nameString,
        player: GetPlayerDataRes | null
      ): Promise<void> {
        const nameAddress = namedUsersData.get(nameKey)
        const composedPlayerData = setIfNot(composedUsersData).get(nameAddress)
        if (composedPlayerData.profileData) {
          await decorateMessageNameAndLinks(message)
        } else {
          if (!player?.userId) return
          composedPlayerData.profileData = await fetchProfileData({
            userId: player?.userId,
            useCache: true
          })
          await decorateMessageNameAndLinks(message)
        }
      }
    }
  }

  message.message = decorateMessageWithLinks(message._originalMessage)
}

async function decorateMessageNameAndLinks(
  message: ChatMessageRepresentation
): Promise<void> {
  if (await asyncHasClaimedName(message.sender_address as Address)) {
    message.addressColor = getAddressColor(message.sender_address)
    message.name = message.name.split('#')[0]
  }
  message.message = decorateMessageWithLinks(message._originalMessage)
}

export const getNameWithHashPostfix = (
  name: string,
  address: string
): `${string}#${string}` => {
  return `${name}#${address
    .substring(address.length - 4, address.length)
    .toLowerCase()}`
}
