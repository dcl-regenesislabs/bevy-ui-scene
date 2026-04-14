const ARCHIPELAGO_BASE_URL =
  'https://archipelago-ea-stats.decentraland.org/comms/peers'
const WORLDS_CONTENT_SERVER_URL =
  'https://worlds-content-server.decentraland.org/wallet'

export type FriendLocation = {
  coordinates: string
  realm?: string
}

export async function fetchFriendLocation(
  userId: string
): Promise<FriendLocation | null> {
  const [peersResult, worldResult] = await Promise.allSettled([
    fetchPeerLocation(userId),
    fetchWorldLocation(userId)
  ])

  if (worldResult.status === 'fulfilled' && worldResult.value) {
    return worldResult.value
  }

  if (peersResult.status === 'fulfilled' && peersResult.value) {
    return peersResult.value
  }

  return null
}

async function fetchPeerLocation(
  userId: string
): Promise<FriendLocation | null> {
  try {
    const response = await fetch(`${ARCHIPELAGO_BASE_URL}?id=${userId}`)
    const data = await response.json()
    const peer = data?.peers?.[0] ?? data?.[0]
    if (!peer?.parcel) return null

    const [x, y] = peer.parcel
    return {
      coordinates: `${x},${y}`,
      realm: peer.realm ?? peer.realmName
    }
  } catch {
    return null
  }
}

async function fetchWorldLocation(
  userId: string
): Promise<FriendLocation | null> {
  try {
    const response = await fetch(
      `${WORLDS_CONTENT_SERVER_URL}/${userId}/connected-world`
    )
    if (!response.ok) return null
    const data = await response.json()
    if (!data?.world) return null

    return {
      coordinates: data.parcel ?? '0,0',
      realm: data.world
    }
  } catch {
    return null
  }
}
