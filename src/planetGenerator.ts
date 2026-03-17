// ---------------------------------------------------------------------------
// Planet randomization — category selection, palette, per-type parameters
// ---------------------------------------------------------------------------

import { Vector3 } from 'three/webgpu'
import { CATEGORY_ROCKY, CATEGORY_GAS, CATEGORY_LIQUID } from './shaders/planet'
import { RING_STYLES } from './shaders/rings'
import { PALETTES } from './palettes'
import type { PlanetPalette } from './palettes'
import { generatePalette } from './paletteGenerator'
import { refreshGui } from './gui'
import {
  ROCKY_RANGES, GAS_RANGES, LIQUID_RANGES, SHARED_RANGES, SIZE_RANGES,
  CATEGORY_WEIGHTS, randomInRange, randomWeighted,
} from './ranges'
import type { SceneRefs } from './sceneRefs'

// ---------------------------------------------------------------------------
// Category filter: 0=all, 1=rocky, 2=gas, 3=liquid
// ---------------------------------------------------------------------------

let categoryFilter = 0

export function setCategoryFilter(value: number) {
  categoryFilter = value
}

// ---------------------------------------------------------------------------
// Category selection
// ---------------------------------------------------------------------------

function pickCategory(): number {
  if (categoryFilter !== 0) return categoryFilter
  const r = Math.random()
  if (r < CATEGORY_WEIGHTS.rocky) return CATEGORY_ROCKY
  if (r < CATEGORY_WEIGHTS.rocky + CATEGORY_WEIGHTS.gas) return CATEGORY_GAS
  return CATEGORY_LIQUID
}

// ---------------------------------------------------------------------------
// Palette application
// ---------------------------------------------------------------------------

function applyPalette(refs: SceneRefs, palette: PlanetPalette) {
  const b = palette.biome
  const biomeKeys = [
    'deepOcean', 'midOcean', 'shallowWater', 'coast',
    'sand', 'sand2', 'savanna', 'savanna2',
    'grass', 'grass2', 'forest', 'forest2',
    'rock', 'rock2', 'snow', 'snowDirty',
  ] as const

  for (const key of biomeKeys) {
    (refs.planetUniforms as any)[key].value.set(b[key])
  }

  refs.planetUniforms.seaLevel.value = palette.seaLevel + (Math.random() - 0.5) * 0.08
  refs.atmosUniforms.atmosphereColor.value.set(palette.atmosphere)
  refs.atmosUniforms.twilightColor.value.set(palette.twilight)

  // Cloud color: palette base + subtle random variation
  refs.cloudUniforms.cloudColor.value.set(palette.cloud)
  const hsl = { h: 0, s: 0, l: 0 }
  refs.cloudUniforms.cloudColor.value.getHSL(hsl)
  hsl.h += (Math.random() - 0.5) * 0.06
  hsl.s = Math.min(1, hsl.s + Math.random() * 0.1)
  hsl.l = Math.min(1, hsl.l * (0.85 + Math.random() * 0.3))
  refs.cloudUniforms.cloudColor.value.setHSL(hsl.h, hsl.s, hsl.l)
}

// ---------------------------------------------------------------------------
// Ring style application
// ---------------------------------------------------------------------------

function applyRingStyle(refs: SceneRefs, style: typeof RING_STYLES[number], palette: PlanetPalette) {
  refs.rings.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3
  const styleKeys = [
    'bandFreq', 'bandFreq2',
    'gapPos1', 'gapWidth1', 'gapPos2', 'gapWidth2', 'gapPos3', 'gapWidth3',
    'innerTrim', 'outerTrim', 'densityVar',
  ] as const
  for (const key of styleKeys) {
    (refs.ringUniforms as any)[key].value = style[key]
  }
  refs.ringUniforms.ringOpacity.value = style.opacity
  refs.ringUniforms.ringColor1.value.set(palette.biome.sand)
  refs.ringUniforms.ringColor2.value.set(palette.biome.rock)
  refs.ringUniforms.ringColor3.value.set(palette.biome.snowDirty)
}

// ---------------------------------------------------------------------------
// Per-category randomization
// ---------------------------------------------------------------------------

function randomizeRocky(refs: SceneRefs) {
  const r = ROCKY_RANGES
  const s = SHARED_RANGES
  const p = refs.planetUniforms

  p.noiseScale.value = randomWeighted(r.noiseScale)
  p.seaLevel.value = Math.random() < 0.15
    ? Math.random() * 0.15
    : randomWeighted(r.seaLevel)
  p.lacunarity.value = randomInRange(r.lacunarity)
  p.gain.value = randomInRange(r.gain)
  p.terrainHeight.value = randomInRange(r.terrainHeight)
  p.warpStrength.value = randomInRange(r.warpStrength)
  p.ridgeStrength.value = randomInRange(r.ridgeStrength)
  p.erosionStrength.value = randomInRange(r.erosionStrength)
  p.moistureScale.value = randomInRange(r.moistureScale)
  p.moistureOffset.value.set(
    randomInRange(s.moistureOffset),
    randomInRange(s.moistureOffset),
    randomInRange(s.moistureOffset)
  )
  p.bumpStrength.value = randomInRange(r.bumpStrength)
  p.terrainPower.value = randomInRange(r.terrainPower)
  p.worleyBlend.value = randomInRange(r.worleyBlend)

  refs.clouds.visible = Math.random() < 0.6
  refs.atmosphere.visible = Math.random() < 0.6
  refs.rings.visible = Math.random() < r.ringChance
}

function randomizeGas(refs: SceneRefs) {
  const r = GAS_RANGES
  const p = refs.planetUniforms

  p.noiseScale.value = randomInRange(r.noiseScale)
  p.lacunarity.value = randomInRange(r.lacunarity)
  p.gain.value = randomInRange(r.gain)
  p.terrainHeight.value = 0
  p.warpStrength.value = randomInRange(r.warpStrength)
  p.ridgeStrength.value = 0
  p.erosionStrength.value = 0

  refs.clouds.visible = false
  refs.atmosphere.visible = true
  refs.rings.visible = Math.random() < r.ringChance
}

function randomizeLiquid(refs: SceneRefs) {
  const r = LIQUID_RANGES
  const p = refs.planetUniforms

  p.noiseScale.value = randomInRange(r.noiseScale)
  p.lacunarity.value = randomInRange(r.lacunarity)
  p.gain.value = randomInRange(r.gain)
  p.terrainHeight.value = 0
  p.warpStrength.value = randomInRange(r.warpStrength)
  p.ridgeStrength.value = 0
  p.erosionStrength.value = 0

  refs.clouds.visible = Math.random() < 0.6
  refs.atmosphere.visible = true
  refs.cloudUniforms.cloudOpacity.value = randomInRange(r.cloudOpacity)
  refs.cloudUniforms.cloudDensity.value = randomInRange(r.cloudDensity)

  refs.rings.visible = false
}

// ---------------------------------------------------------------------------
// Main randomization entry point
// ---------------------------------------------------------------------------

export function randomizePlanet(refs: SceneRefs) {
  const s = SHARED_RANGES
  const p = refs.planetUniforms

  // Seed
  p.seed.value.set(
    randomInRange(s.seed),
    randomInRange(s.seed),
    randomInRange(s.seed)
  )

  // Category + material swap
  const category = pickCategory()
  p.planetCategory.value = category
  refs.planet.material = refs.planetMaterials[category]

  // Palette — filter by category compatibility
  const compatible = PALETTES.filter(pal => !pal.categories || pal.categories.includes(category))
  const palette = Math.random() < 0.6
    ? compatible[Math.floor(Math.random() * compatible.length)]
    : generatePalette()
  applyPalette(refs, palette)

  // Category-specific parameters
  if (category === CATEGORY_ROCKY) randomizeRocky(refs)
  else if (category === CATEGORY_GAS) randomizeGas(refs)
  else randomizeLiquid(refs)

  // Shared cloud variation (only if clouds visible)
  if (refs.clouds.visible) {
    refs.cloudUniforms.cloudScale.value = randomInRange(s.cloudScale)
    refs.cloudUniforms.cloudDensity.value = refs.cloudUniforms.cloudDensity.value || 0.48
    refs.cloudUniforms.cloudSharpness.value = randomInRange(s.cloudSharpness)
  }

  // Atmosphere variation
  refs.atmosUniforms.glowIntensity.value = randomInRange(s.glowIntensity)
  refs.atmosUniforms.glowCoefficient.value = randomInRange(s.glowCoefficient)
  refs.atmosUniforms.glowPower.value = randomInRange(s.glowPower)

  // Planet size
  const sizeKey = category === CATEGORY_GAS ? 'gas' : 'rocky'
  const size = SIZE_RANGES[sizeKey]
  const baseScale = size.base + Math.random() * size.range
  const deformX = 1.0 + (Math.random() - 0.5) * size.deform
  const deformY = 'oblate' in size
    ? 1.0 - Math.random() * size.oblate!
    : 1.0 + (Math.random() - 0.5) * size.deform
  const deformZ = 1.0 + (Math.random() - 0.5) * size.deform
  refs.planetGroup.scale.set(baseScale * deformX, baseScale * deformY, baseScale * deformZ)

  // Rings
  if (refs.rings.visible) {
    const style = RING_STYLES[Math.floor(Math.random() * RING_STYLES.length)]
    applyRingStyle(refs, style, palette)
  }

  // Axial tilt
  refs.planetGroup.rotation.x = 0
  refs.planetGroup.rotation.z = randomInRange(s.axialTilt)

  // Sun direction
  const sunAngle = randomInRange(s.sunAngle) * Math.PI
  const sunY = randomInRange(s.sunY)
  const sunDir = new Vector3(Math.cos(sunAngle) * 5, sunY * 5, Math.sin(sunAngle) * 5)
  refs.sun.position.copy(sunDir)
  p.sunDirection.value.copy(sunDir).normalize()
  refs.sunFlare.position.copy(p.sunDirection.value).multiplyScalar(50)

  // Log planet state
  const catName = category === CATEGORY_ROCKY ? 'Rocky' : category === CATEGORY_GAS ? 'Gas' : 'Liquid'
  console.log(`%c🪐 ${palette.name} (${catName})`, 'font-weight:bold;font-size:14px')
  console.log({
    palette: palette.name,
    category: catName,
    noiseScale: p.noiseScale.value,
    lacunarity: p.lacunarity.value,
    gain: p.gain.value,
    terrainHeight: p.terrainHeight.value,
    seaLevel: p.seaLevel.value,
    warpStrength: p.warpStrength.value,
    ridgeStrength: p.ridgeStrength.value,
    erosionStrength: p.erosionStrength.value,
    terrainPower: p.terrainPower.value,
    moistureScale: p.moistureScale.value,
    bumpStrength: p.bumpStrength.value,
    worleyBlend: p.worleyBlend.value,
    scale: `${refs.planetGroup.scale.x.toFixed(2)}, ${refs.planetGroup.scale.y.toFixed(2)}, ${refs.planetGroup.scale.z.toFixed(2)}`,
    tilt: refs.planetGroup.rotation.z.toFixed(3),
    rings: refs.rings.visible,
    clouds: refs.clouds.visible,
  })

  refreshGui()
}

// ---------------------------------------------------------------------------
// Randomize bar UI
// ---------------------------------------------------------------------------

export function createRandomizeBar(refs: SceneRefs) {
  const bar = document.createElement('div')
  bar.className = 'randomize-bar'

  const select = document.createElement('select')
  select.className = 'category-select'
  const options = [
    { label: 'All', value: 0 },
    { label: 'Rocky', value: CATEGORY_ROCKY },
    { label: 'Gas Giant', value: CATEGORY_GAS },
    { label: 'Liquid', value: CATEGORY_LIQUID },
  ]
  for (const opt of options) {
    const o = document.createElement('option')
    o.value = String(opt.value)
    o.textContent = opt.label
    select.appendChild(o)
  }
  select.addEventListener('change', () => {
    setCategoryFilter(Number(select.value))
  })

  const btn = document.createElement('button')
  btn.textContent = 'Randomize'
  btn.className = 'randomize-btn'
  btn.addEventListener('click', () => randomizePlanet(refs))

  bar.appendChild(select)
  bar.appendChild(btn)
  document.body.appendChild(bar)
}
