export type NameColor = {
  r: number
  g: number
  b: number
}

export enum ONLINE_STATUS {
  OFFLINE = 'Offline',
  ONLINE = 'Online',
  IDLE = 'Idle'
}

export enum FRIENDSHIP_STATUS {
  REQUEST_SENT = 0,
  REQUEST_RECEIVED = 1,
  CANCELED = 2,
  ACCEPTED = 3,
  REJECTED = 4,
  DELETED = 5,
  BLOCKED = 6
}

export type Friend = {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl: string
  nameColor: NameColor | null
  onlineStatus: ONLINE_STATUS
  friendshipStatus: FRIENDSHIP_STATUS
  friendshipRequestMessage?: string
}

export type PaginationData = {
  total: number
  page: number
}

export type FriendsResponse = {
  friends: Friend[]
  paginationData: PaginationData
}
