import { Color4 } from '@dcl/sdk/math'
import { type RarityName } from '../utils/item-definitions'

const ACTIVE_BACKGROUND_COLOR = Color4.fromHexString('#FF7538')
const ACTIVE_COLOR = Color4.fromHexString('#FFFFFF')
const LINK_COLOR = Color4.fromHexString('#E9315BFF')

export const SKIN_COLOR_PRESETS: Color4[] = [
  Color4.fromHexString('#FFE4C6'),
  Color4.fromHexString('#FFDDBC'),
  Color4.fromHexString('#F2C2A5'),
  Color4.fromHexString('#DDB18F'),
  Color4.fromHexString('#CC9B77'),
  Color4.fromHexString('#9A765C'),
  Color4.fromHexString('#7D5D47'),
  Color4.fromHexString('#704B38'),
  Color4.fromHexString('#532A1C'),
  Color4.fromHexString('#3D2216')
]
export const HAIR_COLOR_PRESETS: Color4[] = [
  Color4.fromHexString('#D8D8D8FF'),
  Color4.fromHexString('#2a221e'),
  Color4.fromHexString('#5b4637'),
  Color4.fromHexString('#964a2f'),
  Color4.fromHexString('#d97c13'),
  Color4.fromHexString('#eed07b'),
  Color4.fromHexString('#f0870e'),
  Color4.fromHexString('#fdd240'),
  Color4.fromHexString('#78bd31'),
  Color4.fromHexString('#59a2f7'),
  Color4.fromHexString('#9878ed'),
  Color4.fromHexString('#e875a9')
]
export const EYE_COLOR_PRESETS: Color4[] = [
  Color4.fromHexString('#3B9F4F'),
  Color4.fromHexString('#49DC75'),
  Color4.fromHexString('#387CB0'),
  Color4.fromHexString('#22B3F6'),
  Color4.fromHexString('#AFC5C7'),
  Color4.fromHexString('#878078'),
  Color4.fromHexString('#BF9E5A'),
  Color4.fromHexString('#866042'),
  Color4.fromHexString('#5F3831'),
  Color4.fromHexString('#352626')
]
export const COLOR_PRESETS: Record<string, Color4[]> = {
  skinColor: SKIN_COLOR_PRESETS,
  hairColor: HAIR_COLOR_PRESETS,
  eyesColor: EYE_COLOR_PRESETS
}
const TEXT_COLOR = Color4.fromHexString('#2B272AFF')
export const COLOR = {
  ACTIVE_COLOR,
  LINK_COLOR,
  LINK_BLUE: Color4.fromHexString('#4d82e4'),
  ACTIVE_BACKGROUND_COLOR,
  DROPDOWN_ITEM_HOVER: Color4.create(0, 0, 0, 0.1),
  MAIN_MENU_BACKGROUND: Color4.fromHexString('#161518'),
  NAV_BUTTON_ACTIVE_BACKGROUND: ACTIVE_BACKGROUND_COLOR,
  NAV_BUTTON_ACTIVE_COLOR: ACTIVE_COLOR,
  NAV_BUTTON_INACTIVE_BACKGROUND: Color4.fromHexString('#FFFFFF'),
  NAV_BUTTON_INACTIVE_COLOR: Color4.fromHexString('#000000'),
  SMALL_TAG_BACKGROUND: Color4.fromHexString('#00000066'),
  MENU_ITEM_BACKGROUND: Color4.fromHexString('#42404A'),
  DARK_OPACITY_2: Color4.create(0, 0, 0, 0.2),
  DARK_OPACITY_5: Color4.create(0, 0, 0, 0.5),
  DARK_OPACITY_7: Color4.create(0, 0, 0, 0.7),
  DARK_OPACITY_8: Color4.create(0, 0, 0, 0.8),
  DARK_OPACITY_9: Color4.create(0, 0, 0, 0.9),
  WHITE_OPACITY_2: Color4.create(1, 1, 1, 0.2),
  WHITE_OPACITY_5: Color4.create(1, 1, 1, 0.5),
  WHITE_OPACITY_1: Color4.create(1, 1, 1, 0.1),
  TEXT_COLOR,
  TEXT_COLOR_WHITE: Color4.fromHexString('#f4f4f4'),
  TEXT_COLOR_GREY: Color4.fromHexString('#889AA4FF'),
  TEXT_COLOR_LIGHT_GREY: Color4.fromHexString('#C6C6C6FF'),
  INACTIVE: Color4.fromHexString('#d8d8d8'),
  PANEL_BACKGROUND_LIGHT: Color4.fromHexString('#e4e4e4'),
  WHEEL_BASE_RARITY: Color4.fromHexString('#e1e1e1'),
  BLACK_TRANSPARENT: Color4.create(0, 0, 0, 0),
  MESSAGE_MENTION: Color4.fromHexString('#FD2D58'),
  BUTTON_PRIMARY: Color4.fromHexString('#FD2D58'),
  MESSAGE_MENTION_BACKGROUND: Color4.fromHexString('#3A0F50'),
  WHITE: Color4.White(),
  BLACK: Color4.Black(),
  RED: Color4.Red(),
  BLUE: Color4.Blue(),
  ORANGE: Color4.fromHexString('#FF8648FF'),
  GREEN: Color4.fromHexString('#34ce76'),
  YELLOW: Color4.Yellow(),
  URL_POPUP_BACKGROUND: Color4.fromHexString('#51157F'),
  NOTIFICATIONS_MENU: Color4.fromHexString('#212222FF'),
  NOTIFICATION_ITEM: Color4.fromHexString('#313131FF'),
  BLACK_POPUP_BACKGROUND: TEXT_COLOR,
  STATUS_ACTIVE: Color4.fromHexString('#3cd523'),
  NOTIFICATION_FRIEND: Color4.fromHexString('#ED3E82FF'),
  NOTIFICATION_GIFT: Color4.fromHexString('#FF8648FF'),
  NOTIFICATION_EVENT: Color4.fromHexString('#4386EDFF'),
  NOTIFICATION_BADGE: Color4.fromHexString('#edcb43'),
  CATALOG_SEARCH_BACKGROUND: Color4.fromHexString('#b6b6b6'),
  HR: Color4.fromHexString('#C6C6C6FF')
}
export const RARITY_HEX_COLORS: Record<RarityName, string> = {
  base: '#a09ba8',
  common: '#73d3d3',
  uncommon: '#ff8362',
  rare: '#34ce76',
  epic: '#438fff',
  legendary: '#a14bf3',
  exotic: '#A2DE23',
  mythic: '#ff4bed',
  unique: '#fea217'
}

export const RARITY_COLORS: Record<RarityName, Color4> = {
  base: Color4.fromHexString(RARITY_HEX_COLORS.base),
  common: Color4.fromHexString(RARITY_HEX_COLORS.common),
  uncommon: Color4.fromHexString(RARITY_HEX_COLORS.uncommon),
  rare: Color4.fromHexString(RARITY_HEX_COLORS.rare),
  epic: Color4.fromHexString(RARITY_HEX_COLORS.epic),
  legendary: Color4.fromHexString(RARITY_HEX_COLORS.legendary),
  exotic: Color4.fromHexString(RARITY_HEX_COLORS.exotic),
  mythic: Color4.fromHexString(RARITY_HEX_COLORS.mythic),
  unique: Color4.fromHexString(RARITY_HEX_COLORS.unique)
}
