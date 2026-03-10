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

export type Friend = {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl: string
  nameColor: NameColor | null
  onlineStatus: ONLINE_STATUS
}

export type PaginationData = {
  total: number
  page: number
}

export type FriendsResponse = {
  friends: Friend[]
  paginationData: PaginationData
}
