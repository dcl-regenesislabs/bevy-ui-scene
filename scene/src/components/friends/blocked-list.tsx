import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { UiEntity } from '@dcl/sdk/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'
import { type BlockedUserData } from '../../service/social-service-type'
import { CONTEXT, getFontSize } from '../../service/fontsize-system'
import { Column } from '../ui-system/layout'
import { BlockedListItem } from './blocked-list-item'
import { EmptyBlocked } from './empty-blocked'
import { getFriendshipStateVersion } from '../../service/friend-connectivity-service'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

export function BlockedList(): ReactElement {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserData[]>([])
  const [loaded, setLoaded] = useState<boolean>(false)
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1)
  const fontSize = getFontSize({ context: CONTEXT.SIDE })

  // Refetches on every friendship-state change. That covers both our own
  // block/unblock actions (which bump the version after their RPC — the
  // server does NOT echo own actions back over the stream) and remote
  // friendship events (the connectivity service bumps on every one).
  const friendshipVersion = getFriendshipStateVersion()

  useEffect(() => {
    executeTask(async () => {
      const users = await BevyApi.social.getBlockedUsers()
      setBlockedUsers(users)
      setLoaded(true)
    })
  }, [friendshipVersion])

  if (!loaded) {
    return (
      <Column
        uiTransform={{
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <UiEntity
          uiText={{
            value: 'Loading...',
            fontSize,
            color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }
          }}
        />
      </Column>
    )
  }

  if (blockedUsers.length === 0) {
    return <EmptyBlocked />
  }

  return (
    <Column
      uiTransform={{
        width: '100%',
        overflow: 'scroll',
        flexGrow: 1
      }}
    >
      {blockedUsers.map((user, index) => (
        <BlockedListItem
          key={`blocked-${user.address}`}
          user={user}
          hovered={hoveredIndex === index}
          onMouseEnter={() => {
            setHoveredIndex(index)
          }}
          onMouseLeave={() => {
            setHoveredIndex(-1)
          }}
        />
      ))}
    </Column>
  )
}
