import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Column, Row } from '../../../components/layout'
import useEffect = ReactEcs.useEffect
import { store } from '../../../state/store'
import { updateHudStateAction } from '../../../state/hud/actions'
import { getPlayersInScene } from '~system/Players'
import { getPlayer } from '@dcl/sdk/src/players'
import {
  NAME_MENTION_REGEXP,
  SUGGESTION_NAME_MENTION_REGEXP
} from '../../../components/chat-message/ChatMessage'
import { COLOR } from '../../../components/color-palette'
import { getViewportHeight } from '../../../service/canvas-ratio'
import { getNameWithHashPostfix } from './ChatsAndLogs'
import { type Address, asyncHasClaimedName } from './named-users-data-service'
import { getFontSize } from '../../../service/fontsize-system'

export const ChatMentionSuggestions = (): ReactElement => {
  const [suggestedNames, setSuggestedNames] = ReactEcs.useState<string[]>([])
  useEffect(() => {
    setSuggestedNames(store.getState().hud.chatInputMentionSuggestions)
  }, [store.getState().hud.chatInputMentionSuggestions])

  useEffect(() => {
    const [lastMatch] =
      store.getState().hud.chatInput?.match(SUGGESTION_NAME_MENTION_REGEXP) ??
      []

    const otherMatches =
      store
        .getState()
        .hud.chatInput?.match(NAME_MENTION_REGEXP)
        ?.filter((m: string) => m !== lastMatch)
        .map((m) => m.replace('@', '')) ?? []

    if (lastMatch && !suggestedNames.includes(lastMatch.replace('@', ''))) {
      getSuggestedNames(lastMatch.replace('@', ''))
        .then((suggestedNames) => {
          store.dispatch(
            updateHudStateAction({
              chatInputMentionSuggestions: suggestedNames.filter(
                (s) => !otherMatches.includes(s)
              )
            })
          )
        })
        .catch(console.error)
    } else if (suggestedNames?.length) {
      store.dispatch(
        updateHudStateAction({
          chatInputMentionSuggestions: []
        })
      )
    }
  }, [store.getState().hud.chatInput])

  return (
    <Column
      uiTransform={{
        width: '100%',
        flexGrow: 1,
        flexDirection: 'column-reverse',
        positionType: 'absolute',
        position: {
          bottom: getViewportHeight() * 0.04
        }
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_2 }}
    >
      {suggestedNames.map((suggestedName, index) => {
        return (
          <Row
            uiTransform={{
              width: '100%',
              borderColor: index === 0 ? COLOR.WHITE : COLOR.BLACK_TRANSPARENT,
              borderRadius: getFontSize({}),
              borderWidth: 1
            }}
            key={suggestedName}
            uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
          >
            <UiEntity
              uiText={{
                value: index === 0 ? `<b>${suggestedName}</b>` : suggestedName
              }}
            />
          </Row>
        )
      })}
    </Column>
  )
}

async function getSuggestedNames(matchText: string): Promise<string[]> {
  return (
    await Promise.all(
      (await getPlayersInScene({})).players
        .map(({ userId }) => getPlayer({ userId }))
        .filter(
          (player) =>
            player?.userId &&
            player?.name.toLowerCase().startsWith(matchText.toLowerCase()) &&
            player?.userId !== getPlayer()?.userId &&
            !player?.isGuest
        )
        .map(async (player, index) => {
          if (!player) return
          const hasClaimedName = await asyncHasClaimedName(
            player.userId as Address
          )

          return hasClaimedName
            ? player?.name ?? '?'
            : getNameWithHashPostfix(
                player?.name ?? '',
                player?.userId ?? ''
              )?.toLowerCase()
        })
    )
  )
    .filter((i) => i)
    .sort((a, b) => (a as string).localeCompare(b as string)) as string[]
}
