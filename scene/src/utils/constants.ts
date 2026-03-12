import { Color4 } from '@dcl/sdk/math'
import type { PlaceFromApi } from '../ui-classes/scene-info-card/SceneInfoCard.types'
import type { PhotoMetadataResponse } from 'src/ui-classes/photos/Photos.types'
import { type TextureMode } from '@dcl/react-ecs'
import { COLOR } from '../components/color-palette'

// PRIMARY COLORS
export const RUBY: Color4 = Color4.create(1, 45 / 255, 85 / 255, 1)
export const ALMOST_WHITE: Color4 = Color4.create(
  236 / 255,
  235 / 255,
  237 / 255,
  1
)
export const ALMOST_BLACK: Color4 = Color4.create(
  22 / 255,
  21 / 255,
  24 / 255,
  1
)
// SECONDARY COLORS
export const ORANGE: Color4 = Color4.create(1, 116 / 255, 57 / 255, 1)
export const YELLOW: Color4 = Color4.create(1, 201 / 255, 91 / 255, 1)
export const LAVANDER: Color4 = Color4.create(198 / 255, 64 / 255, 205 / 255, 1)
// TERTIARY COLORS
export const MELON: Color4 = Color4.create(1, 162 / 255, 90 / 255, 1)
export const VIOLET: Color4 = Color4.create(165 / 255, 36 / 255, 179 / 255, 1)
export const PURPLE: Color4 = Color4.create(105 / 255, 31 / 255, 169 / 255, 1)

export const CLICKED_PRIMARY_COLOR: Color4 = Color4.create(
  0.898,
  0.153,
  0.294,
  0.5
)
export const SECONDARY_COLOR: Color4 = Color4.create(0, 0, 0, 0.2)

export const LINK_CHIP_HOVERED: Color4 = { ...Color4.Teal(), a: 0.1 }
export const ALPHA_BLACK_HOVERED: Color4 = { ...Color4.Black(), a: 0.7 }
export const ALPHA_BLACK_NORMAL: Color4 = { ...Color4.Black(), a: 0.35 }
export const ALPHA_BLACK_PANEL: Color4 = { ...Color4.Black(), a: 0.9 }
export const UNSELECTED_TEXT_WHITE: Color4 = { ...ALMOST_WHITE, a: 0.5 }

export const GRAY_TEXT: Color4 = Color4.create(
  113 / 255,
  107 / 255,
  124 / 255,
  1
)

export const BLACK_TEXT: Color4 = Color4.create(22 / 255, 21 / 255, 24 / 255, 1)

export const PANEL_BACKGROUND_COLOR: Color4 = Color4.create(
  228 / 255,
  228 / 255,
  228 / 255,
  1
)

export const DCL_SNOW: Color4 = Color4.create(
  252 / 255,
  252 / 255,
  252 / 255,
  1
)
export const DCL_SHADOW: Color4 = Color4.create(22 / 255, 21 / 255, 24 / 255, 1)
export const TRANSPARENT: Color4 = Color4.create(
  255 / 255,
  255 / 255,
  255 / 255,
  0
)

export const EVENT_BACKGROUND_COLOR: Color4 = Color4.create(
  242 / 255,
  242 / 255,
  242 / 255,
  1
)

export const SELECTED_BUTTON_COLOR: Color4 = { ...Color4.Gray(), a: 0.3 }

// LINKS
export const DCL_DAO_EXPLORERS_DS: string =
  'https://discordapp.com/channels/1156930256545009674/1157417657562304522'

export const COUNTRIES = [
  '- Select an option -',
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Cape Verde',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo (Congo-Brazzaville)',
  'Congo (Democratic Republic of the)',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czechia',
  'Decentraland',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini (Swaziland)',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Korea (North)',
  'Korea (South)',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar (Burma)',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine State',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States of America',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
  'Other'
]

export const LANGUAGES = [
  '- Select an option -',
  'Afrikaans',
  'Albanian',
  'Amharic',
  'Arabic',
  'Armenian',
  'Azerbaijani',
  'Basque',
  'Belarusian',
  'Bengali',
  'Bosnian',
  'Bulgarian',
  'Catalan',
  'Chinese',
  'Croatian',
  'Czech',
  'Danish',
  'Dutch',
  'English',
  'Estonian',
  'Finnish',
  'French',
  'Galician',
  'Georgian',
  'German',
  'Greek',
  'Gujarati',
  'Hebrew',
  'Hindi',
  'Hungarian',
  'Icelandic',
  'Indonesian',
  'Irish',
  'Italian',
  'Japanese',
  'Javanese',
  'Kannada',
  'Kazakh',
  'Khmer',
  'Korean',
  'Kurdish',
  'Kyrgyz',
  'Lao',
  'Latvian',
  'Lithuanian',
  'Macedonian',
  'Malay',
  'Malayalam',
  'Maltese',
  'Maori',
  'Marathi',
  'Mongolian',
  'Nepali',
  'Norwegian',
  'Pashto',
  'Persian',
  'Polish',
  'Portuguese',
  'Punjabi',
  'Romanian',
  'Russian',
  'Samoan',
  'Serbian',
  'Sindhi',
  'Sinhala',
  'Slovak',
  'Slovenian',
  'Somali',
  'Spanish',
  'Swahili',
  'Swedish',
  'Tagalog',
  'Tajik',
  'Tamil',
  'Telugu',
  'Thai',
  'Tibetan',
  'Tigrinya',
  'Turkish',
  'Turkmen',
  'Ukrainian',
  'Urdu',
  'Uyghur',
  'Uzbek',
  'Vietnamese',
  'Welsh',
  'Xhosa',
  'Yiddish',
  'Yoruba',
  'Zulu',
  'Other'
]

export const GENDERS = [
  '- Select an option -',
  'Female',
  'Male',
  'Transgender',
  'Neutral',
  'Non-Binary',
  'Fluid',
  'Agender',
  'Pangender',
  'Queer',
  'Two-Spirit',
  'Other'
]

export const SEXUAL_ORIENTATIONS = [
  '- Select an option -',
  'Heterosexual',
  'Bisexual',
  'Lesbian',
  'Gay',
  'Asexual',
  'Queer',
  'Polysexual',
  'Pansexual',
  'Other'
]

export const PRONOUNS = [
  '- Select an option -',
  'He / Him',
  'She / Her',
  'They / Them',
  'Ze / Zir',
  'Xe / Xem',
  'Ze / Hir',
  'Per / Per',
  'Other'
]

export const RELATIONSHIP_STATUS = [
  '- Select an option -',
  'Single',
  'In a relationship',
  'Engaged',
  'Married',
  "It's complicated",
  'In an open relationship',
  'Widowed',
  'Separated',
  'Divorced',
  'Other'
]

export const EMPLOYMENT_STATUS = [
  '- Select an option -',
  'Studying',
  'Working',
  'Chilling',
  'Looking for a job',
  'Home/Family',
  'Retired',
  'Other'
]

export const LEFT_PANEL_MIN_WIDTH = 280
export const LEFT_PANEL_WIDTH_FACTOR = 0.15

export const HELP_URL: string = 'https://decentraland.org/help/'
export const DCL_EXPLORER_URL: string = 'https://dclexplorer.com/'

export const EMPTY_PLACE: PlaceFromApi = {
  id: 'empty-place',
  title: 'Title',
  description: 'Description',
  image: 'https://peer.decentraland.org/content/contents/-',
  owner: null,
  positions: ['-9999,-9999'],
  base_position: '-9999,-9999',
  contact_name: 'contact_name',
  contact_email: null,
  content_rating: 'RP',
  disabled: false,
  disabled_at: null,
  created_at: '2023-05-09T19:05:10.218Z',
  updated_at: '2023-05-09T19:05:10.218Z',
  favorites: 126,
  likes: 75,
  dislikes: 11,
  categories: ['poi', 'social'],
  like_rate: 0.83928573,
  highlighted: false,
  highlighted_image: null,
  world: false,
  world_name: null,
  deployed_at: '2024-12-11T22:40:12.047Z',
  textsearch: "'bitcinema':1A 'by':3B,6B 'powered':2B,5B 'vtatv':4B,7B",
  like_score: 0.7250946,
  user_favorite: false,
  user_like: false,
  user_dislike: false,
  user_count: 0,
  user_visits: 298
}
export const LOADING_PLACE_TEXT = 'Loading...'
export const LOADING_PLACE_ID = 'loading-place'
export const LOADING_PLACE: PlaceFromApi = {
  id: LOADING_PLACE_ID,
  title: LOADING_PLACE_TEXT,
  description: LOADING_PLACE_TEXT,
  image: '',
  owner: null,
  positions: ['0,0'],
  base_position: '0,0',
  contact_name: '',
  contact_email: null,
  content_rating: 'RP',
  disabled: false,
  disabled_at: null,
  created_at: '0000-00-00T19:05:10.218Z',
  updated_at: '0000-00-00T19:05:10.218Z',
  favorites: 0,
  likes: 0,
  dislikes: 0,
  categories: [],
  like_rate: 0,
  highlighted: false,
  highlighted_image: null,
  world: false,
  world_name: null,
  deployed_at: '0000-00-00:40:12.047Z',
  textsearch: '',
  like_score: 0,
  user_favorite: false,
  user_like: false,
  user_dislike: false,
  user_count: 0,
  user_visits: 0
}
export const TEXTURE_SLICES_05 = {
  top: 0.5,
  bottom: 0.5,
  left: 0.5,
  right: 0.5
}
export const ROUNDED_TEXTURE_BACKGROUND = {
  textureMode: 'nine-slices' as TextureMode,
  texture: {
    src: 'assets/images/backgrounds/rounded.png'
  },
  textureSlices: TEXTURE_SLICES_05,
  color: COLOR.ACTIVE_BACKGROUND_COLOR
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const ONE_ADDRESS = '0x0000000000000000000000000000000000000001'
export const EMPTY_PHOTO_METADATA: PhotoMetadataResponse = {
  id: '00000000-0000-0000-0000-000000000000',
  url: 'https://example.com/default-image.jpg',
  thumbnailUrl: 'https://example.com/default-thumbnail.jpg',
  isPublic: false,
  metadata: {
    userName: 'Anonymous',
    userAddress: ZERO_ADDRESS,
    dateTime: '0',
    realm: 'unknown',
    scene: {
      name: 'Default Scene',
      location: {
        x: '0',
        y: '0'
      }
    },
    visiblePeople: [],
    placeId: '00000000-0000-0000-0000-000000000000'
  }
}
export const ITEMS_ORDER_BY = {
  DATE: 'date',
  RARITY: 'rarity',
  NAME: 'name'
}
export const ITEMS_ORDER_DIRECTION = {
  DESC: 'DESC',
  ASC: 'ASC'
}
export const SORT_OPTIONS = [
  'Newest',
  'Oldest',
  'Rarest',
  'Less rare',
  'Name A-Z',
  'Name Z-A'
]
export const SORT_OPTIONS_MAP = SORT_OPTIONS.map((O) => ({
  value: O,
  label: O
}))
export const SORT_OPTIONS_PARAMS = [
  [ITEMS_ORDER_BY.DATE, ITEMS_ORDER_DIRECTION.DESC],
  [ITEMS_ORDER_BY.DATE, ITEMS_ORDER_DIRECTION.ASC],
  [ITEMS_ORDER_BY.RARITY, ITEMS_ORDER_DIRECTION.DESC],
  [ITEMS_ORDER_BY.RARITY, ITEMS_ORDER_DIRECTION.ASC],
  [ITEMS_ORDER_BY.NAME, ITEMS_ORDER_DIRECTION.ASC],
  [ITEMS_ORDER_BY.NAME, ITEMS_ORDER_DIRECTION.DESC]
]
export const MAX_ZINDEX = 98303
export const CATALYST_BASE_URL_FALLBACK = 'https://peer.decentraland.org'
export const WORLDS_CONTENT_SERVER_URL =
  'https://worlds-content-server.decentraland.org'
export const LOCAL_STORAGE_OUTFITS_KEY = 'outfits'
export const DOUBLE_CLICK_DELAY = 400
export const LOCAL_PREVIEW_REALM_NAME = 'LocalPreview'
export const MENU_BACKGROUND_TEXTURE = {
  src: 'assets/images/menu/background.png'
}
