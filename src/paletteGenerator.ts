import { PALETTES } from './palettes'
import type { PlanetPalette } from './palettes'

// ---------------------------------------------------------------------------
// Vary an existing palette — subtle HSL shifts to keep it looking good
// ---------------------------------------------------------------------------

function hexToHSL(hex: number): [number, number, number] {
  const r = ((hex >> 16) & 0xff) / 255
  const g = ((hex >> 8) & 0xff) / 255
  const b = (hex & 0xff) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): number {
  h = ((h % 1) + 1) % 1
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  const sector = Math.floor(h * 6) % 6
  if (sector === 0) { r = c; g = x }
  else if (sector === 1) { r = x; g = c }
  else if (sector === 2) { g = c; b = x }
  else if (sector === 3) { g = x; b = c }
  else if (sector === 4) { r = x; b = c }
  else { r = c; b = x }
  return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255)
}

function varyColor(hex: number, hueShift: number, satMul: number, litShift: number): number {
  const [h, s, l] = hexToHSL(hex)
  return hslToHex(h + hueShift, s * satMul, l + litShift)
}

/**
 * Takes a base palette and returns a new one with subtle random variations.
 * - Uniform hue shift across all biome colors (keeps harmony intact)
 * - Small per-color saturation and lightness jitter
 */
export function varyPalette(base: PlanetPalette): PlanetPalette {
  // Global hue shift — same for all colors so harmony is preserved
  const hueShift = (Math.random() - 0.5) * 0.08  // ±0.04 (±14°)

  // Global saturation multiplier — slight variation
  const satMul = 0.85 + Math.random() * 0.30  // 0.85–1.15

  const biomeKeys = [
    'deepOcean', 'midOcean', 'shallowWater', 'coast',
    'sand', 'sand2', 'savanna', 'savanna2',
    'grass', 'grass2', 'forest', 'forest2',
    'rock', 'rock2', 'snow', 'snowDirty',
  ] as const

  const biome: any = {}
  for (const key of biomeKeys) {
    // Per-color lightness jitter — very small
    const litJitter = (Math.random() - 0.5) * 0.06  // ±0.03
    biome[key] = varyColor(base.biome[key], hueShift, satMul, litJitter)
  }

  // Atmosphere, twilight, cloud — same hue shift
  const atmosphere = varyColor(base.atmosphere, hueShift, satMul, (Math.random() - 0.5) * 0.08)
  const twilight = varyColor(base.twilight, hueShift * 0.5, satMul, (Math.random() - 0.5) * 0.06)
  const cloud = varyColor(base.cloud, hueShift * 0.3, 1.0, (Math.random() - 0.5) * 0.04)

  // Sea level — small variation from base
  const seaLevel = base.seaLevel + (Math.random() - 0.5) * 0.08

  return {
    name: `${base.name} (var)`,
    seaLevel,
    biome,
    atmosphere,
    twilight,
    cloud,
    categories: base.categories,
  }
}

/**
 * Pick a palette: always starts from a curated base.
 * 80% exact base, 20% varied version.
 */
export function pickPalette(category: number): PlanetPalette {
  const compatible = PALETTES.filter(pal => !pal.categories || pal.categories.includes(category))
  const base = compatible[Math.floor(Math.random() * compatible.length)]

  if (Math.random() < 0.8) return base
  return varyPalette(base)
}
