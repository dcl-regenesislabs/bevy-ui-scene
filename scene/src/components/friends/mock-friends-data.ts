import type {
  FriendData,
  FriendRequestData
} from '../../service/social-service-type'

export const mockFriends: FriendData[] = [
  {
    address: '0x6440350e4adb24c82874e6a34505425f8b66db80',
    name: 'CryptoNaut',
    hasClaimedName: true,
    profilePictureUrl: ''
  },
  {
    address: '0x0000000000000000000000000000000000000000',
    name: 'Guest#1234',
    hasClaimedName: false,
    profilePictureUrl: ''
  },
  {
    address: '0xe3a0856066cbea6ef5528af2f00eae255bd84eb7',
    name: 'VoxelKnight',
    hasClaimedName: true,
    profilePictureUrl: ''
  },
  {
    address: '0x481bed8645804714Efd1dE3f25467f78E7Ba07d6',
    name: 'SkyRunner',
    hasClaimedName: true,
    profilePictureUrl: ''
  },
  {
    address: '0xd82d005e8f8d5385db40ba23884a5c967bb1e8af',
    name: 'EtherWolf',
    hasClaimedName: true,
    profilePictureUrl: ''
  },
  {
    address: '0x8b7c37671f37db95e9d84714f7a4464d552aa0ea',
    name: 'SolarNomad',
    hasClaimedName: true,
    profilePictureUrl: ''
  }
]

export const mockSentRequests: FriendRequestData[] = [
  {
    address: '0x4b538e1e044922aec2f428ec7e17a99f44205ff9',
    name: 'MetaExplorer',
    hasClaimedName: true,
    profilePictureUrl: '',
    createdAt: 1710700000,
    id: 'req-sent-1'
  }
]

export const mockReceivedRequests: FriendRequestData[] = [
  {
    address: '0x235ec1cc12dbda96f014896de38f74f6e60239c0',
    name: 'PixelWandererMagical',
    hasClaimedName: true,
    profilePictureUrl: '',
    createdAt: 1710600000,
    message: 'Hey! We met at the music festival in Genesis Plaza',
    id: 'req-recv-1'
  },
  {
    address: '0x3faacc4e4287b82ccc1ca40adab0fc49a380b7ab',
    name: 'QuantumR',
    hasClaimedName: true,
    profilePictureUrl: '',
    createdAt: 1710500000,
    id: 'req-recv-2'
  }
]
