export interface PlanetPalette {
  name: string
  seaLevel: number
  biome: {
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
  atmosphere: number
  twilight: number
  cloud: number
}

export const PALETTES: PlanetPalette[] = [
  // 0 — Earth (default)
  {
    name: 'Earth',
    seaLevel: 0.50,
    biome: {
      deepOcean: 0x0a1e3d, midOcean: 0x0c3d6b,
      shallowWater: 0x1a6e8e, coast: 0x2a8a8a,
      sand: 0xc2a55a, sand2: 0xd4b86a,
      savanna: 0x8a9a3a, savanna2: 0xa0a848,
      grass: 0x4a7a2e, grass2: 0x3a6e28,
      forest: 0x1e4a18, forest2: 0x2a5a1a,
      rock: 0x6a5a48, rock2: 0x524030,
      snow: 0xf2f2f8, snowDirty: 0xc8c0b8,
    },
    atmosphere: 0x6baaee,
    twilight: 0xd4845a,
    cloud: 0xffffff,
  },

  // 1 — Mars
  {
    name: 'Mars',
    seaLevel: 0.38,
    biome: {
      deepOcean: 0x1a0a0a, midOcean: 0x2a1510,
      shallowWater: 0x3a2018, coast: 0x4a2a1a,
      sand: 0xc4713a, sand2: 0xb8653a,
      savanna: 0xa85a30, savanna2: 0x9a5028,
      grass: 0x8a4520, grass2: 0x7a3a1a,
      forest: 0x6a3018, forest2: 0x5a2815,
      rock: 0x5a3a2a, rock2: 0x4a2e20,
      snow: 0xd4a888, snowDirty: 0xc09878,
    },
    atmosphere: 0xd4956a,
    twilight: 0x8a4030,
    cloud: 0xd4a080,
  },

  // 2 — Ice World
  {
    name: 'Ice World',
    seaLevel: 0.45,
    biome: {
      deepOcean: 0x08182e, midOcean: 0x0c2848,
      shallowWater: 0x1a4a6e, coast: 0x2a6a8a,
      sand: 0x8ab0c8, sand2: 0x9ac0d4,
      savanna: 0xa0c4d8, savanna2: 0xb0d0e0,
      grass: 0xb8d8e8, grass2: 0xc0dce8,
      forest: 0xc8e0ec, forest2: 0xd0e4f0,
      rock: 0x8898a8, rock2: 0x707e8e,
      snow: 0xeef4fa, snowDirty: 0xd8e4f0,
    },
    atmosphere: 0x8ac0ee,
    twilight: 0x6a8aaa,
    cloud: 0xe8f0f8,
  },

  // 3 — Volcanic
  {
    name: 'Volcanic',
    seaLevel: 0.42,
    biome: {
      deepOcean: 0x1a0500, midOcean: 0x3a0a00,
      shallowWater: 0x6a1500, coast: 0x8a2000,
      sand: 0x2a2020, sand2: 0x3a2828,
      savanna: 0x1e1818, savanna2: 0x282020,
      grass: 0x181212, grass2: 0x201818,
      forest: 0x141010, forest2: 0x1a1414,
      rock: 0x2a2222, rock2: 0x201a1a,
      snow: 0xff6a20, snowDirty: 0xe05010,
    },
    atmosphere: 0xe04a20,
    twilight: 0xff3000,
    cloud: 0x4a3a38,
  },

  // 4 — Alien (purple/teal)
  {
    name: 'Alien',
    seaLevel: 0.48,
    biome: {
      deepOcean: 0x0a0a2a, midOcean: 0x15154a,
      shallowWater: 0x2a2a6a, coast: 0x3a3a7a,
      sand: 0x6a4a8a, sand2: 0x7a5a9a,
      savanna: 0x4a8a7a, savanna2: 0x3a7a6a,
      grass: 0x2a9a8a, grass2: 0x1a8a7a,
      forest: 0x6a2a8a, forest2: 0x5a1a7a,
      rock: 0x4a3a5a, rock2: 0x3a2a4a,
      snow: 0xd4c0ea, snowDirty: 0xb8a0d0,
    },
    atmosphere: 0x5aea8a,
    twilight: 0x8a4ae0,
    cloud: 0xc8b8e0,
  },

  // 5 — Ocean World
  {
    name: 'Ocean World',
    seaLevel: 0.60,
    biome: {
      deepOcean: 0x040e28, midOcean: 0x082050,
      shallowWater: 0x104878, coast: 0x1a6898,
      sand: 0xb0a870, sand2: 0xc0b880,
      savanna: 0x5a8a3a, savanna2: 0x6a9a48,
      grass: 0x3a7a28, grass2: 0x2a6a20,
      forest: 0x1a5a18, forest2: 0x1a4a14,
      rock: 0x5a5848, rock2: 0x484638,
      snow: 0xe8eaf0, snowDirty: 0xc8cad0,
    },
    atmosphere: 0x5098e8,
    twilight: 0xc87a50,
    cloud: 0xf0f0f8,
  },

  // 6 — Desert
  {
    name: 'Desert',
    seaLevel: 0.40,
    biome: {
      deepOcean: 0x1a1008, midOcean: 0x2a1a10,
      shallowWater: 0x3a2818, coast: 0x4a3820,
      sand: 0xd4b878, sand2: 0xe0c888,
      savanna: 0xc0a060, savanna2: 0xb09050,
      grass: 0xa08848, grass2: 0x907840,
      forest: 0x706838, forest2: 0x605830,
      rock: 0x8a7858, rock2: 0x786848,
      snow: 0xf0e8d8, snowDirty: 0xd8d0c0,
    },
    atmosphere: 0xe8b870,
    twilight: 0xd07838,
    cloud: 0xf0e8d8,
  },

  // 7 — Toxic
  {
    name: 'Toxic',
    seaLevel: 0.46,
    biome: {
      deepOcean: 0x0a1a08, midOcean: 0x143010,
      shallowWater: 0x2a5018, coast: 0x3a6820,
      sand: 0x6a7a30, sand2: 0x7a8a38,
      savanna: 0x5a6a28, savanna2: 0x4a5a20,
      grass: 0x8aaa30, grass2: 0x7a9a28,
      forest: 0x3a4a18, forest2: 0x2a3a10,
      rock: 0x4a4a30, rock2: 0x3a3a28,
      snow: 0xc8d890, snowDirty: 0xb0c078,
    },
    atmosphere: 0x80c840,
    twilight: 0xa0e030,
    cloud: 0xa8b878,
  },

  // 8 — Lavender
  {
    name: 'Lavender',
    seaLevel: 0.50,
    biome: {
      deepOcean: 0x18102a, midOcean: 0x281a48,
      shallowWater: 0x3a2a68, coast: 0x4a3a7a,
      sand: 0xc0a0b8, sand2: 0xd0b0c8,
      savanna: 0xb890b8, savanna2: 0xc8a0c8,
      grass: 0xa080a8, grass2: 0x907098,
      forest: 0x786088, forest2: 0x685078,
      rock: 0x6a5870, rock2: 0x5a4860,
      snow: 0xf0e8f4, snowDirty: 0xd8d0e0,
    },
    atmosphere: 0xb888e8,
    twilight: 0xe888a8,
    cloud: 0xe8e0f0,
  },

  // 9 — Jungle
  {
    name: 'Jungle',
    seaLevel: 0.52,
    biome: {
      deepOcean: 0x061820, midOcean: 0x0a2838,
      shallowWater: 0x184858, coast: 0x286868,
      sand: 0x6a8a48, sand2: 0x7a9a58,
      savanna: 0x3a7a28, savanna2: 0x4a8a38,
      grass: 0x1a6a18, grass2: 0x0a5a0a,
      forest: 0x084a08, forest2: 0x043a04,
      rock: 0x3a4830, rock2: 0x2a3820,
      snow: 0xc8d8c0, snowDirty: 0xa8b8a0,
    },
    atmosphere: 0x60c890,
    twilight: 0xd0a050,
    cloud: 0xe0e8e0,
  },
]
