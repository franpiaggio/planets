// ---------------------------------------------------------------------------
// Randomization ranges & GUI slider limits for planet generation.
// Single source of truth — no more magic numbers scattered in scene/gui.
// ---------------------------------------------------------------------------

export interface Range {
  min: number
  max: number
}

export interface WeightedRange extends Range {
  rareBelow: number     // threshold value
  rareChance: number    // probability of falling below threshold (0–1)
}

// ---------------------------------------------------------------------------
// GUI slider limits (how far the user can drag)
// ---------------------------------------------------------------------------

export const GUI_LIMITS = {
  noiseScale:      { min: 0.2, max: 10 },
  lacunarity:      { min: 1.0, max: 4.0 },
  gain:            { min: 0.1, max: 0.9 },
  terrainHeight:   { min: 0.0, max: 2.0 },
  seaLevel:        { min: 0.0, max: 0.7 },
  warpStrength:    { min: 0.0, max: 5.0 },
  ridgeStrength:   { min: 0.0, max: 0.5 },
  erosionStrength: { min: 0.0, max: 1.0 },
  terrainPower:    { min: 0.5, max: 3.0 },
  moistureScale:   { min: 0.5, max: 5.0 },
  bumpStrength:    { min: 0.0, max: 2.0 },
  worleyBlend:     { min: 0.0, max: 1.0 },
  cloudScale:      { min: 1.0, max: 10.0 },
  cloudDensity:    { min: 0.0, max: 1.0 },
  cloudSharpness:  { min: 1.0, max: 10.0 },
  cloudOpacity:    { min: 0.0, max: 1.0 },
  glowIntensity:   { min: 0.0, max: 3.0 },
  glowCoefficient: { min: 0.0, max: 1.0 },
  glowPower:       { min: 1.0, max: 10.0 },
} as const

// ---------------------------------------------------------------------------
// Rocky planet randomization ranges
// ---------------------------------------------------------------------------

export const ROCKY_RANGES = {
  noiseScale:      { min: 1.8, max: 2.7, rareBelow: 1.5, rareChance: 0.05 } as WeightedRange,
  seaLevel:        { min: 0.25, max: 0.60, rareBelow: 0.25, rareChance: 0.1 } as WeightedRange,
  lacunarity:      { min: 2.50, max: 2.90 },
  gain:            { min: 0.35, max: 0.55 },
  terrainHeight:   { min: 0.10, max: 0.20 },
  warpStrength:    { min: 0.35, max: 0.75 },
  ridgeStrength:   { min: 0.06, max: 0.18 },
  erosionStrength: { min: 0.0,  max: 0.7 },
  moistureScale:   { min: 1.2,  max: 2.8 },
  bumpStrength:    { min: 0.4,  max: 0.9 },
  terrainPower:    { min: 1.2,  max: 2.0 },
  worleyBlend:     { min: 0.1,  max: 0.35 },
  ringChance:      0.15,
}

// ---------------------------------------------------------------------------
// Gas giant randomization ranges
// ---------------------------------------------------------------------------

export const GAS_RANGES = {
  noiseScale:    { min: 1.8, max: 3.5 },
  lacunarity:    { min: 2.0, max: 2.5 },
  gain:          { min: 0.4, max: 0.6 },
  warpStrength:  { min: 0.1, max: 0.55 },  // keep bands smooth; too high = blobby mess
  ringChance:    0.5,
}

// ---------------------------------------------------------------------------
// Liquid planet randomization ranges
// ---------------------------------------------------------------------------

export const LIQUID_RANGES = {
  noiseScale:     { min: 1.5, max: 2.5 },
  lacunarity:     { min: 1.72, max: 2.12 },
  gain:           { min: 0.35, max: 0.55 },
  warpStrength:   { min: 0.4, max: 0.8 },
  cloudOpacity:   { min: 0.5, max: 0.8 },
  cloudDensity:   { min: 0.4, max: 0.55 },
}

// ---------------------------------------------------------------------------
// Lava planet randomization ranges
// ---------------------------------------------------------------------------

export const LAVA_RANGES = {
  noiseScale:      { min: 1.8, max: 3.0 },
  lacunarity:      { min: 2.2, max: 2.8 },
  gain:            { min: 0.4, max: 0.55 },
  terrainHeight:   { min: 0.04, max: 0.10 },
  warpStrength:    { min: 0.3, max: 0.7 },
  ridgeStrength:   { min: 0.05, max: 0.15 },
  worleyBlend:     { min: 0.2, max: 0.5 },
  ringChance:      0.05,
}

// ---------------------------------------------------------------------------
// Shared randomization ranges (apply to all categories)
// ---------------------------------------------------------------------------

export const SHARED_RANGES = {
  seed:            { min: -50, max: 50 },
  moistureOffset:  { min: -50, max: 50 },
  cloudScale:      { min: 2.0, max: 4.0 },
  cloudSharpness:  { min: 2.0, max: 4.0 },
  glowIntensity:   { min: 0.35, max: 0.65 },
  glowCoefficient: { min: 0.45, max: 0.65 },
  glowPower:       { min: 6.5, max: 9.5 },
  axialTilt:       { min: -0.26, max: 0.26 },
  sunAngle:        { min: -0.4, max: 0.4 },    // fraction of PI
  sunY:            { min: 0.05, max: 0.35 },
}

// ---------------------------------------------------------------------------
// Planet size/shape ranges
// ---------------------------------------------------------------------------

export const SIZE_RANGES: Record<string, { base: number; range: number; deform: number; oblate?: number }> = {
  rocky:   { base: 0.6, range: 0.8, deform: 0.12 },
  gas:     { base: 1.0, range: 0.6, deform: 0.12, oblate: 0.08 },
  liquid:  { base: 0.6, range: 0.8, deform: 0.12 },
  lava:    { base: 0.5, range: 0.7, deform: 0.10 },
}

// ---------------------------------------------------------------------------
// Category weights for random selection
// ---------------------------------------------------------------------------

export const CATEGORY_WEIGHTS = {
  rocky: 0.50,    // 50%
  gas: 0.22,      // 22%
  liquid: 0.15,   // 15%
  lava: 0.13,     // 13%
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Random float in [range.min, range.max] */
export function randomInRange(range: Range): number {
  return range.min + Math.random() * (range.max - range.min)
}

/** Random float with a rare chance of going below a threshold */
export function randomWeighted(range: WeightedRange): number {
  if (Math.random() < range.rareChance) {
    return Math.random() * range.rareBelow
  }
  return range.min + Math.random() * (range.max - range.min)
}
