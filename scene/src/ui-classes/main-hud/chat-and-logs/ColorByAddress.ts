import { type RGBAColor, type RGBColor } from '../../../bevy-api/interface'
import USER_NAME_COLORS from './UserNameColors.json'
import { ZERO_ADDRESS } from '../../../utils/constants'
import { getHashNumber } from '../../../service/string-hash-number'
import { memoize } from '../../../utils/function-utils'

const addressColors = new Map<string, RGBColor>()

function _getAddressColor(address: string): RGBAColor {
  // TODO this is not in sync with default color in Godot/Unity explorers
  if (address === ZERO_ADDRESS) return { r: 0.6, g: 0.6, b: 0.6, a: 1 }
  if (addressColors.has(address)) return addressColors.get(address) as RGBAColor

  const addressColor =
    USER_NAME_COLORS[getHashNumber(address, 0, USER_NAME_COLORS.length - 1)]
  addressColors.set(address, addressColor)
  return addressColor
}

export const getAddressColor = memoize(_getAddressColor)
