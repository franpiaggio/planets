// ---------------------------------------------------------------------------
// PlanetConfig — complete snapshot of a planet's appearance.
// Every value needed to reproduce the exact same planet.
// ---------------------------------------------------------------------------

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface BiomeColors {
  deepOcean: number
  midOcean: number
  shallowWater: number
  coast: number
  sand: number
  sand2: number
  savanna: number
  savanna2: number
  grass: number
  grass2: number
  forest: number
  forest2: number
  rock: number
  rock2: number
  snow: number
  snowDirty: number
}

export interface TerrainConfig {
  noiseScale: number
  lacunarity: number
  gain: number
  terrainHeight: number
  seaLevel: number
  warpStrength: number
  ridgeStrength: number
  erosionStrength: number
  terrainPower: number
  moistureScale: number
  moistureOffset: Vec3
  bumpStrength: number
  worleyBlend: number
}

export interface CloudConfig {
  visible: boolean
  scale: number
  density: number
  sharpness: number
  opacity: number
  color: number       // hex
}

export interface AtmosphereConfig {
  visible: boolean
  color: number        // hex
  twilightColor: number // hex
  glowIntensity: number
  glowCoefficient: number
  glowPower: number
}

export interface RingConfig {
  visible: boolean
  colors: [number, number, number]  // hex triplet
  opacity: number
  bandFreq: number
  bandFreq2: number
  gaps: [number, number, number, number, number, number] // pos1,w1,pos2,w2,pos3,w3
  innerTrim: number
  outerTrim: number
  densityVar: number
  rotationX: number
}

export interface TransformConfig {
  scale: Vec3
  axialTilt: number    // rotation.z in radians
}

export interface LightingConfig {
  sunDirection: Vec3
}

export interface PlanetConfig {
  category: number     // 1=rocky, 2=gas, 3=liquid
  seed: Vec3
  terrain: TerrainConfig
  biome: BiomeColors
  clouds: CloudConfig
  atmosphere: AtmosphereConfig
  rings: RingConfig
  transform: TransformConfig
  lighting: LightingConfig
}

// ---------------------------------------------------------------------------
// Default config — matches shader defaults for a rocky planet
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: PlanetConfig = {
  category: 1,
  seed: { x: 0, y: 0, z: 0 },
  terrain: {
    noiseScale: 2.2,
    lacunarity: 2.7,
    gain: 0.45,
    terrainHeight: 0.15,
    seaLevel: 0.50,
    warpStrength: 0.55,
    ridgeStrength: 0.12,
    erosionStrength: 0.0,
    terrainPower: 1.5,
    moistureScale: 1.8,
    moistureOffset: { x: 42.3, y: 17.1, z: 88.7 },
    bumpStrength: 0.6,
    worleyBlend: 0.15,
  },
  biome: {
    deepOcean: 0x0a1e3d,
    midOcean: 0x0c3d6b,
    shallowWater: 0x1a6e8e,
    coast: 0x2a8a8a,
    sand: 0xc2a55a,
    sand2: 0xd4b86a,
    savanna: 0x8a9a3a,
    savanna2: 0xa0a848,
    grass: 0x4a7a2e,
    grass2: 0x3a6e28,
    forest: 0x1e4a18,
    forest2: 0x2a5a1a,
    rock: 0x6a5a48,
    rock2: 0x524030,
    snow: 0xf2f2f8,
    snowDirty: 0xc8c0b8,
  },
  clouds: {
    visible: true,
    scale: 3.0,
    density: 0.48,
    sharpness: 3.0,
    opacity: 0.45,
    color: 0xffffff,
  },
  atmosphere: {
    visible: true,
    color: 0x6baaee,
    twilightColor: 0xd4845a,
    glowIntensity: 0.5,
    glowCoefficient: 0.55,
    glowPower: 8.0,
  },
  rings: {
    visible: false,
    colors: [0xc8b888, 0x8a7858, 0xa09070],
    opacity: 0.7,
    bandFreq: 40.0,
    bandFreq2: 90.0,
    gaps: [0.40, 0.02, 0.60, 0.02, 0.80, 0.02],
    innerTrim: 0.0,
    outerTrim: 0.0,
    densityVar: 0.15,
    rotationX: Math.PI / 2,
  },
  transform: {
    scale: { x: 1, y: 1, z: 1 },
    axialTilt: 0,
  },
  lighting: {
    sunDirection: { x: 1, y: 0.3, z: 0.5 },
  },
}
