import type { ExplorerSetting } from '../bevy-api/interface'

/**
 * Quality presets for Graphics + Performance settings.
 *
 * Each preset is a per-category map of `settingName → PresetValue`. The
 * key MUST match the `title()` returned by bevy-explorer (see
 * `crates/system_bridge/src/settings/*.rs`). Missing keys are tolerated
 * silently — if bevy-explorer renames a setting the preset just won't
 * touch it.
 *
 * `PresetValue`:
 *  - `number` — written verbatim (index for namedVariants, or raw value
 *    for sliders).
 *  - `'min' | 'max' | 'default'` — resolved at apply-time against
 *    `setting.minValue / maxValue / default`. Useful for slider settings
 *    whose range we don't want to hardcode here.
 */
export type SettingsPresetName = 'min' | 'medium' | 'high' | 'ultra'
export type PresetValue = number | 'min' | 'max' | 'default'
export type PresetCategoryKey = 'Graphics' | 'Performance'

type PresetBucket = Record<string, PresetValue>
type Preset = Record<PresetCategoryKey, PresetBucket>

export const SETTINGS_PRESETS: Record<SettingsPresetName, Preset> = {
  min: {
    Graphics: {
      'Anti-aliasing': 0,
      'Ambient Brightness': 'default',
      Bloom: 0,
      Fog: 0,
      'Depth of Field': 0,
      'Distant Scene Rendering': 0,
      'Empty Parcel Props': 0,
      'Out-of-bounds Effect': 0,
      'Shadow settings': 0, // Off
      'Shadow Distance': 0,
      'Light Count': 0,
      'Shadow Caster Count': 0,
      SSAO: 0
    },
    Performance: {
      // Target Frame Rate is a namedVariant with values
      // [10, 15, 20, 30, 60, 120, 144, 999]. Indexes:
      //   3 = 30 fps, 4 = 60 fps, 7 = Uncapped.
      // We bottom out at 30 fps — lower than that is unusable.
      'Target Frame Rate': 3,
      'Scene Load Distance': 'min', // 10 parcels
      'Scene Unload Distance': 'min', // 0
      // Hard-coded reasonable minima: setting these to the literal
      // minValue (1 avatar, 0 videos) is technically valid but breaks
      // the scene experience. 10 avatars + 1 video keeps things usable.
      'Max Avatars': 10,
      'Max Downloads': 'min', // 1
      'Max Videos': 1,
      'Scene Threads': 'min', // 1
      'Disk Cache Size': 0
    }
  },
  medium: {
    Graphics: {
      'Anti-aliasing': 1,
      'Ambient Brightness': 'default',
      Bloom: 1,
      Fog: 1,
      'Depth of Field': 0,
      'Distant Scene Rendering': 1,
      'Empty Parcel Props': 1,
      'Out-of-bounds Effect': 0,
      'Shadow settings': 1, // Low
      'Shadow Distance': 100,
      'Light Count': 16,
      'Shadow Caster Count': 8,
      SSAO: 0
    },
    Performance: {
      'Target Frame Rate': 4, // 60 fps
      'Scene Load Distance': 'default',
      'Scene Unload Distance': 'default',
      'Max Avatars': 'default',
      'Max Downloads': 'default',
      'Max Videos': 'default',
      'Scene Threads': 'default',
      'Disk Cache Size': 2
    }
  },
  high: {
    Graphics: {
      'Anti-aliasing': 2,
      'Ambient Brightness': 'default',
      Bloom: 1,
      Fog: 2,
      'Depth of Field': 1,
      'Distant Scene Rendering': 2,
      'Empty Parcel Props': 2,
      'Out-of-bounds Effect': 1,
      'Shadow settings': 2, // High
      'Shadow Distance': 200,
      'Light Count': 64,
      'Shadow Caster Count': 16,
      SSAO: 1
    },
    Performance: {
      'Target Frame Rate': 'max', // Uncapped
      'Scene Load Distance': 'max',
      'Scene Unload Distance': 'max',
      'Max Avatars': 'max',
      'Max Downloads': 'max',
      'Max Videos': 'max',
      'Scene Threads': 'max',
      'Disk Cache Size': 3
    }
  },
  ultra: {
    Graphics: {
      // MSAA 4x rather than 8x: the WebGPU spec only guarantees [1,4]
      // samples for HDR formats (Rgba16Float / Rgb10a2Unorm), so 8x
      // crashes wgpu at pipeline-creation time on many GPUs (Apple
      // Silicon included). 4x is the highest universally safe setting.
      'Anti-aliasing': 4,
      'Ambient Brightness': 'max',
      Bloom: 2,
      Fog: 2,
      'Depth of Field': 2,
      'Distant Scene Rendering': 2,
      'Empty Parcel Props': 3,
      'Out-of-bounds Effect': 1,
      'Shadow settings': 2, // High
      'Shadow Distance': 'max',
      'Light Count': 'max',
      'Shadow Caster Count': 'max',
      SSAO: 2
    },
    Performance: {
      'Target Frame Rate': 'max',
      'Scene Load Distance': 'max',
      'Scene Unload Distance': 'max',
      'Max Avatars': 'max',
      'Max Downloads': 'max',
      'Max Videos': 'max',
      'Scene Threads': 'max',
      'Disk Cache Size': 4
    }
  }
}

export const PRESET_NAMES: readonly SettingsPresetName[] = [
  'min',
  'medium',
  'high',
  'ultra'
] as const

export function isPresetCategory(
  category: string
): category is PresetCategoryKey {
  return category === 'Graphics' || category === 'Performance'
}

/**
 * Resolve a `PresetValue` against a concrete `ExplorerSetting`. For
 * namedVariants the index is clamped to `[0, length-1]` so an out-of-
 * range index in the preset table doesn't crash the UI.
 */
function resolvePresetValue(
  presetVal: PresetValue,
  setting: ExplorerSetting
): number {
  const isNamedVariant = (setting.namedVariants?.length ?? 0) > 0
  const maxIndex = isNamedVariant ? setting.namedVariants.length - 1 : Infinity

  let raw: number
  if (presetVal === 'min') raw = isNamedVariant ? 0 : setting.minValue
  else if (presetVal === 'max')
    raw = isNamedVariant ? maxIndex : setting.maxValue
  else if (presetVal === 'default') raw = setting.default
  else raw = presetVal

  if (isNamedVariant) return Math.max(0, Math.min(maxIndex, raw))
  return Math.max(setting.minValue, Math.min(setting.maxValue, raw))
}

/**
 * Compute the list of `{name, value}` updates a preset would produce
 * for the given category. Skips settings that are not in the loaded
 * list (tolerant of bevy-explorer renames). The caller owns the
 * mutation + the BevyApi.setSetting calls.
 */
export function computePresetUpdates(
  presetName: SettingsPresetName,
  category: PresetCategoryKey,
  loaded: ExplorerSetting[]
): Array<{ name: string; value: number }> {
  const bucket = SETTINGS_PRESETS[presetName][category]
  const byName: Record<string, ExplorerSetting> = {}
  for (const s of loaded) byName[s.name] = s

  const updates: Array<{ name: string; value: number }> = []
  for (const [name, presetVal] of Object.entries(bucket)) {
    const setting = byName[name]
    if (setting === undefined) continue
    const value = resolvePresetValue(presetVal, setting)
    if (value !== setting.value) updates.push({ name, value })
  }
  return updates
}
