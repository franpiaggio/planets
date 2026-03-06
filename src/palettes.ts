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

  // 10 — Coral Reef
  {
    name: 'Coral Reef',
    seaLevel: 0.55,
    biome: {
      deepOcean: 0x051a30, midOcean: 0x0a3058,
      shallowWater: 0x1a5a80, coast: 0x2a7a9a,
      sand: 0xe0c898, sand2: 0xd0b888,
      savanna: 0xe08870, savanna2: 0xd07060,
      grass: 0xf0a060, grass2: 0xe89050,
      forest: 0xc86080, forest2: 0xb85070,
      rock: 0x7a6058, rock2: 0x6a5048,
      snow: 0xf8e8e0, snowDirty: 0xe8d0c8,
    },
    atmosphere: 0x60b8d8,
    twilight: 0xf08860,
    cloud: 0xf0f0f0,
  },

  // 11 — Tundra
  {
    name: 'Tundra',
    seaLevel: 0.44,
    biome: {
      deepOcean: 0x0a1828, midOcean: 0x102840,
      shallowWater: 0x1a4060, coast: 0x2a5878,
      sand: 0x8a9088, sand2: 0x989e96,
      savanna: 0x708878, savanna2: 0x607868,
      grass: 0x587060, grass2: 0x486050,
      forest: 0x3a5040, forest2: 0x2e4434,
      rock: 0x686868, rock2: 0x585858,
      snow: 0xe8eaee, snowDirty: 0xc8ccd0,
    },
    atmosphere: 0x90b0c8,
    twilight: 0xc89070,
    cloud: 0xd8dce0,
  },

  // 12 — Copper
  {
    name: 'Copper',
    seaLevel: 0.43,
    biome: {
      deepOcean: 0x1a0e08, midOcean: 0x2a1810,
      shallowWater: 0x3a2818, coast: 0x4a3820,
      sand: 0xb87840, sand2: 0xc88848,
      savanna: 0xa06830, savanna2: 0x905828,
      grass: 0x7a4820, grass2: 0x6a3a18,
      forest: 0x583018, forest2: 0x482810,
      rock: 0x4a3828, rock2: 0x3a2820,
      snow: 0xd8c0a0, snowDirty: 0xc0a880,
    },
    atmosphere: 0xd89850,
    twilight: 0xb06030,
    cloud: 0xc8b898,
  },

  // 13 — Midnight
  {
    name: 'Midnight',
    seaLevel: 0.48,
    biome: {
      deepOcean: 0x020510, midOcean: 0x040a20,
      shallowWater: 0x081838, coast: 0x0c2848,
      sand: 0x283050, sand2: 0x303858,
      savanna: 0x1a2440, savanna2: 0x202a48,
      grass: 0x141e38, grass2: 0x101a30,
      forest: 0x0c1428, forest2: 0x081020,
      rock: 0x1a1a28, rock2: 0x141420,
      snow: 0x4a5070, snowDirty: 0x384060,
    },
    atmosphere: 0x2040a0,
    twilight: 0x4020a0,
    cloud: 0x283048,
  },

  // 14 — Autumn
  {
    name: 'Autumn',
    seaLevel: 0.48,
    biome: {
      deepOcean: 0x0a1828, midOcean: 0x102840,
      shallowWater: 0x1a4060, coast: 0x2a5878,
      sand: 0xc8a050, sand2: 0xd8b060,
      savanna: 0xc87830, savanna2: 0xd88838,
      grass: 0xb06020, grass2: 0xa05018,
      forest: 0x884020, forest2: 0x783818,
      rock: 0x685040, rock2: 0x584030,
      snow: 0xf0e0c8, snowDirty: 0xd8c8b0,
    },
    atmosphere: 0xd0a060,
    twilight: 0xe07030,
    cloud: 0xf0e8d8,
  },

  // 15 — Abyss
  {
    name: 'Abyss',
    seaLevel: 0.56,
    biome: {
      deepOcean: 0x000810, midOcean: 0x001020,
      shallowWater: 0x002040, coast: 0x003058,
      sand: 0x1a2a38, sand2: 0x203040,
      savanna: 0x142028, savanna2: 0x182830,
      grass: 0x101820, grass2: 0x0c1418,
      forest: 0x081010, forest2: 0x060c0c,
      rock: 0x1a1a20, rock2: 0x141418,
      snow: 0x3a4858, snowDirty: 0x2a3848,
    },
    atmosphere: 0x1040a0,
    twilight: 0x0828a0,
    cloud: 0x203040,
  },

  // 16 — Sakura
  {
    name: 'Sakura',
    seaLevel: 0.50,
    biome: {
      deepOcean: 0x101828, midOcean: 0x182840,
      shallowWater: 0x284060, coast: 0x385878,
      sand: 0xe8c0c0, sand2: 0xf0d0d0,
      savanna: 0xe0a0a8, savanna2: 0xd89098,
      grass: 0xd08088, grass2: 0xc87078,
      forest: 0xa85868, forest2: 0x984858,
      rock: 0x786068, rock2: 0x685058,
      snow: 0xf8f0f4, snowDirty: 0xe8d8e0,
    },
    atmosphere: 0xe8a0c0,
    twilight: 0xd07090,
    cloud: 0xf4e8f0,
  },

  // 17 — Emerald
  {
    name: 'Emerald',
    seaLevel: 0.50,
    biome: {
      deepOcean: 0x041810, midOcean: 0x082a18,
      shallowWater: 0x104828, coast: 0x186038,
      sand: 0x50a868, sand2: 0x60b878,
      savanna: 0x409858, savanna2: 0x308848,
      grass: 0x207838, grass2: 0x186828,
      forest: 0x105820, forest2: 0x0a4818,
      rock: 0x2a4830, rock2: 0x203828,
      snow: 0xc0e8c8, snowDirty: 0xa0d0a8,
    },
    atmosphere: 0x40d888,
    twilight: 0x20a850,
    cloud: 0xd0f0d8,
  },

  // 18 — Sandstorm
  {
    name: 'Sandstorm',
    seaLevel: 0.36,
    biome: {
      deepOcean: 0x201808, midOcean: 0x302010,
      shallowWater: 0x483018, coast: 0x584020,
      sand: 0xe8d098, sand2: 0xf0d8a0,
      savanna: 0xd8c088, savanna2: 0xd0b078,
      grass: 0xc0a068, grass2: 0xb09058,
      forest: 0x988050, forest2: 0x887048,
      rock: 0x887058, rock2: 0x786048,
      snow: 0xf8f0e0, snowDirty: 0xe8e0c8,
    },
    atmosphere: 0xe8c878,
    twilight: 0xd89840,
    cloud: 0xe8e0c8,
  },

  // 19 — Frozen Methane
  {
    name: 'Frozen Methane',
    seaLevel: 0.47,
    biome: {
      deepOcean: 0x081018, midOcean: 0x101828,
      shallowWater: 0x1a2840, coast: 0x283848,
      sand: 0x506878, sand2: 0x587080,
      savanna: 0x485868, savanna2: 0x405060,
      grass: 0x384850, grass2: 0x304048,
      forest: 0x283840, forest2: 0x203038,
      rock: 0x384048, rock2: 0x303840,
      snow: 0x88a8b8, snowDirty: 0x7090a0,
    },
    atmosphere: 0x5888b0,
    twilight: 0x406888,
    cloud: 0x708898,
  },

  // 20 — Rust
  {
    name: 'Rust',
    seaLevel: 0.40,
    biome: {
      deepOcean: 0x180808, midOcean: 0x281010,
      shallowWater: 0x381818, coast: 0x482020,
      sand: 0xb85830, sand2: 0xc86838,
      savanna: 0xa04828, savanna2: 0x903820,
      grass: 0x803018, grass2: 0x702810,
      forest: 0x602010, forest2: 0x501808,
      rock: 0x4a2818, rock2: 0x3a2010,
      snow: 0xd8a880, snowDirty: 0xc09068,
    },
    atmosphere: 0xc86830,
    twilight: 0xa04020,
    cloud: 0xb89878,
  },

  // 21 — Candy
  {
    name: 'Candy',
    seaLevel: 0.50,
    biome: {
      deepOcean: 0x1a0828, midOcean: 0x2a1040,
      shallowWater: 0x4a2060, coast: 0x5a3078,
      sand: 0xf0a8d0, sand2: 0xf8b8d8,
      savanna: 0xe890c0, savanna2: 0xe080b0,
      grass: 0xd870a0, grass2: 0xd06090,
      forest: 0xb85088, forest2: 0xa84078,
      rock: 0x8a5078, rock2: 0x784068,
      snow: 0xf8e8f4, snowDirty: 0xf0d8e8,
    },
    atmosphere: 0xf080c0,
    twilight: 0xe050a0,
    cloud: 0xf8e0f0,
  },

  // 22 — Obsidian
  {
    name: 'Obsidian',
    seaLevel: 0.44,
    biome: {
      deepOcean: 0x080808, midOcean: 0x101010,
      shallowWater: 0x181818, coast: 0x202020,
      sand: 0x383838, sand2: 0x404040,
      savanna: 0x303030, savanna2: 0x282828,
      grass: 0x222222, grass2: 0x1c1c1c,
      forest: 0x181818, forest2: 0x141414,
      rock: 0x2a2a2a, rock2: 0x222222,
      snow: 0x505050, snowDirty: 0x404040,
    },
    atmosphere: 0x303848,
    twilight: 0x282838,
    cloud: 0x383838,
  },

  // 23 — Tropical
  {
    name: 'Tropical',
    seaLevel: 0.52,
    biome: {
      deepOcean: 0x041830, midOcean: 0x082850,
      shallowWater: 0x10487a, coast: 0x20689a,
      sand: 0xf0d888, sand2: 0xf8e098,
      savanna: 0x60b850, savanna2: 0x50a840,
      grass: 0x30a030, grass2: 0x209020,
      forest: 0x108018, forest2: 0x087010,
      rock: 0x5a6848, rock2: 0x4a5838,
      snow: 0xe8f0e0, snowDirty: 0xd0d8c0,
    },
    atmosphere: 0x50c8e8,
    twilight: 0xf0a040,
    cloud: 0xf8f8f0,
  },

  // 24 — Golden
  {
    name: 'Golden',
    seaLevel: 0.46,
    biome: {
      deepOcean: 0x181008, midOcean: 0x281810,
      shallowWater: 0x402818, coast: 0x583820,
      sand: 0xe0b040, sand2: 0xe8c050,
      savanna: 0xd0a030, savanna2: 0xc09028,
      grass: 0xb08020, grass2: 0xa07018,
      forest: 0x886018, forest2: 0x785010,
      rock: 0x685030, rock2: 0x584028,
      snow: 0xf8e8b0, snowDirty: 0xe8d890,
    },
    atmosphere: 0xe8c050,
    twilight: 0xd09030,
    cloud: 0xf0e8c8,
  },

  // 25 — Neptune
  {
    name: 'Neptune',
    seaLevel: 0.54,
    biome: {
      deepOcean: 0x040818, midOcean: 0x081030,
      shallowWater: 0x102050, coast: 0x183068,
      sand: 0x304878, sand2: 0x385080,
      savanna: 0x284068, savanna2: 0x203860,
      grass: 0x1a3058, grass2: 0x142850,
      forest: 0x102048, forest2: 0x0c1840,
      rock: 0x283040, rock2: 0x202838,
      snow: 0x6080b0, snowDirty: 0x507098,
    },
    atmosphere: 0x3060d0,
    twilight: 0x2040b0,
    cloud: 0x506888,
  },

  // 26 — Savanna
  {
    name: 'Savanna',
    seaLevel: 0.42,
    biome: {
      deepOcean: 0x0a1820, midOcean: 0x102838,
      shallowWater: 0x1a4050, coast: 0x2a5868,
      sand: 0xd8b868, sand2: 0xc8a858,
      savanna: 0xb89848, savanna2: 0xa88838,
      grass: 0x8a7a30, grass2: 0x7a6a28,
      forest: 0x5a5820, forest2: 0x4a4818,
      rock: 0x786848, rock2: 0x685838,
      snow: 0xf0e8d0, snowDirty: 0xd8d0b8,
    },
    atmosphere: 0xd8b060,
    twilight: 0xe88838,
    cloud: 0xe8e0d0,
  },

  // 27 — Arctic Aurora
  {
    name: 'Arctic Aurora',
    seaLevel: 0.48,
    biome: {
      deepOcean: 0x040c18, midOcean: 0x081828,
      shallowWater: 0x103040, coast: 0x184858,
      sand: 0x90a8b8, sand2: 0xa0b8c8,
      savanna: 0x80a0a8, savanna2: 0x709098,
      grass: 0x608888, grass2: 0x507878,
      forest: 0x406868, forest2: 0x305858,
      rock: 0x606878, rock2: 0x505868,
      snow: 0xe0f0f8, snowDirty: 0xc8e0e8,
    },
    atmosphere: 0x40e8a0,
    twilight: 0x30a8e0,
    cloud: 0xd0e8f0,
  },

  // 28 — Crimson
  {
    name: 'Crimson',
    seaLevel: 0.46,
    biome: {
      deepOcean: 0x180408, midOcean: 0x280810,
      shallowWater: 0x401018, coast: 0x581820,
      sand: 0x8a3030, sand2: 0x9a3838,
      savanna: 0x7a2828, savanna2: 0x6a2020,
      grass: 0x5a1818, grass2: 0x4a1010,
      forest: 0x3a0c0c, forest2: 0x2a0808,
      rock: 0x4a2020, rock2: 0x3a1818,
      snow: 0xc88080, snowDirty: 0xb06868,
    },
    atmosphere: 0xc83030,
    twilight: 0xa02020,
    cloud: 0x8a5050,
  },

  // 29 — Oasis
  {
    name: 'Oasis',
    seaLevel: 0.50,
    biome: {
      deepOcean: 0x081820, midOcean: 0x102838,
      shallowWater: 0x1a4858, coast: 0x286870,
      sand: 0xd0b870, sand2: 0xc0a860,
      savanna: 0x80a848, savanna2: 0x70983a,
      grass: 0x50882a, grass2: 0x407820,
      forest: 0x306818, forest2: 0x205810,
      rock: 0x6a6048, rock2: 0x5a5038,
      snow: 0xe8e8d8, snowDirty: 0xd0d0c0,
    },
    atmosphere: 0x70c8a0,
    twilight: 0xd8a050,
    cloud: 0xf0f0e8,
  },
]
