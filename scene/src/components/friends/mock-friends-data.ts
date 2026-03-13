import {
  Friend,
  FRIENDSHIP_STATUS,
  ONLINE_STATUS
} from '../../service/social-service-type'
export const getFriends = () =>
  mockFriends.filter((f) => f.friendshipStatus === FRIENDSHIP_STATUS.ACCEPTED)
export const getFriendRequests = () =>
  mockFriends.filter(
    (f) =>
      f.friendshipStatus === FRIENDSHIP_STATUS.REQUEST_SENT ||
      f.friendshipStatus === FRIENDSHIP_STATUS.REQUEST_RECEIVED
  )
export const mockFriends: Friend[] = [
  {
    address: '0x6440350e4adb24c82874e6a34505425f8b66db80',
    name: 'CryptoNaut',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 255, g: 45, b: 85 },
    onlineStatus: ONLINE_STATUS.ONLINE,
    friendshipStatus: FRIENDSHIP_STATUS.ACCEPTED
  },
  {
    address: '0x4b538e1e044922aec2f428ec7e17a99f44205ff9',
    name: 'MetaExplorer',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 52, g: 199, b: 89 },
    onlineStatus: ONLINE_STATUS.ONLINE,
    friendshipStatus: FRIENDSHIP_STATUS.REQUEST_SENT
  },
  {
    address: '0x235ec1cc12dbda96f014896de38f74f6e60239c0',
    name: 'PixelWandererMagical',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 88, g: 86, b: 214 },
    onlineStatus: ONLINE_STATUS.OFFLINE,
    friendshipStatus: FRIENDSHIP_STATUS.REQUEST_RECEIVED,
    friendshipRequestMessage:
      'Hey! We met at the music festival in Genesis Plaza'
  },
  {
    address: '0x0000000000000000000000000000000000000000',
    name: 'Guest#1234',
    hasClaimedName: false,
    profilePictureUrl: '',
    nameColor: null,
    onlineStatus: ONLINE_STATUS.IDLE,
    friendshipStatus: FRIENDSHIP_STATUS.ACCEPTED
  },
  {
    address: '0x0000000000000000000000000000000000000001',
    name: 'Anonymous',
    hasClaimedName: false,
    profilePictureUrl: '',
    nameColor: null,
    onlineStatus: ONLINE_STATUS.OFFLINE,
    friendshipStatus: FRIENDSHIP_STATUS.BLOCKED
  },
  {
    address: '0xe3a0856066cbea6ef5528af2f00eae255bd84eb7',
    name: 'VoxelKnight',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 255, g: 159, b: 10 },
    onlineStatus: ONLINE_STATUS.ONLINE,
    friendshipStatus: FRIENDSHIP_STATUS.ACCEPTED
  },
  {
    address: '0x511a22cDd2c4eE8357bB02df2578037Ffe8a4d8d',
    name: 'NeonDrifter',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 0, g: 199, b: 190 },
    onlineStatus: ONLINE_STATUS.IDLE,
    friendshipStatus: FRIENDSHIP_STATUS.CANCELED
  },
  {
    address: '0x481bed8645804714Efd1dE3f25467f78E7Ba07d6',
    name: 'SkyRunner',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 90, g: 200, b: 250 },
    onlineStatus: ONLINE_STATUS.ONLINE,
    friendshipStatus: FRIENDSHIP_STATUS.ACCEPTED
  },
  {
    address: '0x07752012ea7475da9efd46371dbc2220b9f13b54',
    name: 'BlockPhoenix',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 175, g: 82, b: 222 },
    onlineStatus: ONLINE_STATUS.OFFLINE,
    friendshipStatus: FRIENDSHIP_STATUS.REJECTED
  },
  {
    address: '0xd82d005e8f8d5385db40ba23884a5c967bb1e8af',
    name: 'EtherWolf',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 255, g: 69, b: 58 },
    onlineStatus: ONLINE_STATUS.ONLINE,
    friendshipStatus: FRIENDSHIP_STATUS.ACCEPTED
  },
  {
    address: '0x3faacc4e4287b82ccc1ca40adab0fc49a380b7ab',
    name: 'QuantumR',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 48, g: 176, b: 199 },
    onlineStatus: ONLINE_STATUS.IDLE,
    friendshipStatus: FRIENDSHIP_STATUS.REQUEST_RECEIVED
  },
  {
    address: '0x0fac2f8df694335ebcb29f871be72dfcff431b6c',
    name: 'GridHunter',
    hasClaimedName: false,
    profilePictureUrl: '',
    nameColor: null,
    onlineStatus: ONLINE_STATUS.ONLINE,
    friendshipStatus: FRIENDSHIP_STATUS.DELETED
  },
  {
    address: '0x8b7c37671f37db95e9d84714f7a4464d552aa0ea',
    name: 'SolarNomad',
    hasClaimedName: true,
    profilePictureUrl: '',
    nameColor: { r: 255, g: 214, b: 10 },
    onlineStatus: ONLINE_STATUS.ONLINE,
    friendshipStatus: FRIENDSHIP_STATUS.ACCEPTED
  }
]
