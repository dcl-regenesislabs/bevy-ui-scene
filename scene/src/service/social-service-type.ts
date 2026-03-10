export type NameColor = {
  r: number
  g: number
  b: number
}

export type Friend = {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl: string
  nameColor: NameColor | null
  online: boolean
}

export type PaginationData = {
  total: number
  page: number
}

export type FriendsResponse = {
  friends: Friend[]
  paginationData: PaginationData
}
