import type { PlanetPalette } from './palettes'

// ---------------------------------------------------------------------------
// Color theory helpers
// ---------------------------------------------------------------------------

type HSL = { h: number; s: number; l: number }

function hsl(h: number, s: number, l: number): HSL {
  return { h: ((h % 1) + 1) % 1, s: Math.max(0, Math.min(1, s)), l: Math.max(0, Math.min(1, l)) }
}

function hslToHex({ h, s, l }: HSL): number {
  // HSL → RGB → hex integer
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
  const ri = Math.round((r + m) * 255)
  const gi = Math.round((g + m) * 255)
  const bi = Math.round((b + m) * 255)
  return (ri << 16) | (gi << 8) | bi
}

function jitter(value: number, amount: number): number {
  return value + (Math.random() - 0.5) * 2 * amount
}

// ---------------------------------------------------------------------------
// Harmony schemes — return accent hues relative to base
// ---------------------------------------------------------------------------

type Harmony = 'analogous' | 'complementary' | 'triadic' | 'splitComplementary' | 'tetradic'

const HARMONIES: Harmony[] = ['analogous', 'complementary', 'triadic', 'splitComplementary', 'tetradic']

function harmonyHues(base: number, harmony: Harmony): number[] {
  switch (harmony) {
    case 'analogous':
      return [base, base + 0.08, base - 0.08]
    case 'complementary':
      return [base, base + 0.5]
    case 'triadic':
      return [base, base + 0.333, base + 0.667]
    case 'splitComplementary':
      return [base, base + 0.42, base + 0.58]
    case 'tetradic':
      return [base, base + 0.25, base + 0.5, base + 0.75]
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// ---------------------------------------------------------------------------
// Generate a procedural palette
// ---------------------------------------------------------------------------

export function generatePalette(): PlanetPalette {
  const baseHue = Math.random()
  const harmony = pick(HARMONIES)
  const hues = harmonyHues(baseHue, harmony)

  // Pick roles from harmony hues
  const oceanHue = hues[0]
  const landHue = hues.length > 2 ? hues[1] : baseHue + rand(0.05, 0.15)
  const accentHue = hues[hues.length - 1]

  // Decide "warmth" — affects saturation and lightness curves
  const isWarm = (baseHue > 0.02 && baseHue < 0.15) || (baseHue > 0.8)
  const isCold = baseHue > 0.45 && baseHue < 0.72

  // Ocean saturation & lightness
  const oceanSat = rand(0.35, 0.7)
  const oceanBaseLightness = rand(0.06, 0.14)

  // Land saturation
  const landSat = rand(0.3, 0.65)
  const landMidLight = rand(0.35, 0.55)

  // Accent for vegetation/grass — shift from land hue
  const vegHue = jitter(landHue + rand(-0.06, 0.06), 0.02)
  const vegSat = rand(0.35, 0.6)

  // Rock — desaturated version of accent
  const rockHue = jitter(accentHue, 0.04)
  const rockSat = rand(0.1, 0.3)

  // Snow — very light, slightly tinted
  const snowHue = jitter(oceanHue, 0.05)
  const snowSat = rand(0.02, 0.12)

  const biome = {
    // Ocean: 4 steps from very dark to medium, same hue family
    deepOcean: hslToHex(hsl(oceanHue, oceanSat, oceanBaseLightness)),
    midOcean: hslToHex(hsl(jitter(oceanHue, 0.02), oceanSat, oceanBaseLightness + 0.06)),
    shallowWater: hslToHex(hsl(jitter(oceanHue, 0.03), oceanSat * 0.9, oceanBaseLightness + 0.14)),
    coast: hslToHex(hsl(jitter(oceanHue, 0.03), oceanSat * 0.8, oceanBaseLightness + 0.22)),

    // Sand: transition zone — lighter, warmer shift
    sand: hslToHex(hsl(jitter(landHue, 0.03), landSat, landMidLight + 0.15)),
    sand2: hslToHex(hsl(jitter(landHue, 0.03), landSat * 0.9, landMidLight + 0.20)),

    // Savanna: mid-elevation, blend between land and vegetation
    savanna: hslToHex(hsl(jitter((landHue + vegHue) / 2, 0.03), landSat * 0.85, landMidLight + 0.05)),
    savanna2: hslToHex(hsl(jitter((landHue + vegHue) / 2, 0.03), landSat * 0.8, landMidLight)),

    // Grass: vegetation hue, medium lightness
    grass: hslToHex(hsl(vegHue, vegSat, landMidLight - 0.03)),
    grass2: hslToHex(hsl(jitter(vegHue, 0.02), vegSat, landMidLight - 0.07)),

    // Forest: darker vegetation
    forest: hslToHex(hsl(jitter(vegHue, 0.02), vegSat * 0.9, landMidLight - 0.14)),
    forest2: hslToHex(hsl(jitter(vegHue, 0.03), vegSat * 0.85, landMidLight - 0.18)),

    // Rock: desaturated accent
    rock: hslToHex(hsl(rockHue, rockSat, rand(0.28, 0.38))),
    rock2: hslToHex(hsl(jitter(rockHue, 0.02), rockSat * 0.8, rand(0.22, 0.30))),

    // Snow: very light with subtle tint
    snow: hslToHex(hsl(snowHue, snowSat, rand(0.90, 0.97))),
    snowDirty: hslToHex(hsl(jitter(snowHue, 0.02), snowSat + 0.05, rand(0.78, 0.88))),
  }

  // Atmosphere — lighter, more saturated version of ocean/accent blend
  const atmosHue = jitter(isCold ? oceanHue : accentHue, 0.05)
  const atmosphere = hslToHex(hsl(atmosHue, rand(0.45, 0.75), rand(0.50, 0.70)))

  // Twilight — warm shift from atmosphere (toward orange/red)
  const twilightHue = isWarm ? jitter(baseHue, 0.05) : jitter(0.06, 0.04) // push toward orange
  const twilight = hslToHex(hsl(twilightHue, rand(0.5, 0.8), rand(0.45, 0.65)))

  // Clouds — very desaturated, light, tinted by atmosphere
  const cloud = hslToHex(hsl(jitter(atmosHue, 0.08), rand(0.02, 0.15), rand(0.88, 0.97)))

  // Sea level — varies by "planet type feel"
  const seaLevel = rand(0.38, 0.58)

  return {
    name: `Procedural (${harmony})`,
    seaLevel,
    biome,
    atmosphere,
    twilight,
    cloud,
  }
}
