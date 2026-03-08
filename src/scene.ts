import {
  PerspectiveCamera, Scene, Color, SphereGeometry, RingGeometry, Mesh, Group, WebGPURenderer,
  DirectionalLight, AmbientLight, PostProcessing, Vector3
} from 'three/webgpu'
import { pass, uniform, nodeObject } from 'three/tsl'
import BloomNode from 'three/addons/tsl/display/BloomNode.js'
import { anamorphic } from 'three/addons/tsl/display/AnamorphicNode.js'
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'stats-gl'
import { createPlanetMaterial, CATEGORY_ROCKY, CATEGORY_GAS, CATEGORY_LIQUID } from './shaders/planet'
import { createAtmosphereMaterial, applyInnerGlow } from './shaders/atmosphere'
import { createCloudMaterial } from './shaders/clouds'
import { setupGui, refreshGui } from './gui'
import { createStarfield } from './stars'
import { PALETTES } from './palettes'
import type { PlanetPalette } from './palettes'
import { createSunFlare } from './lensflare'
import { createRingMaterial, RING_STYLES } from './shaders/rings'
import type { PlanetConfig } from './planetConfig'
import {
  ROCKY_RANGES, GAS_RANGES, LIQUID_RANGES, SHARED_RANGES, SIZE_RANGES,
  CATEGORY_WEIGHTS, randomInRange, randomWeighted,
} from './ranges'

// ---------------------------------------------------------------------------
// Scene state
// ---------------------------------------------------------------------------

let camera: PerspectiveCamera
let scene: Scene
let renderer: WebGPURenderer
let postProcessing: PostProcessing
let controls: OrbitControls
let stats: Stats
let planetGroup: Group
let sun: DirectionalLight
let sunFlare: any
let planet: Mesh
let clouds: Mesh
let atmosphere: Mesh
let rings: Mesh
let ringUniformsRef: ReturnType<typeof createRingMaterial>['uniforms']
let planetUniforms: ReturnType<typeof createPlanetMaterial>['uniforms']
let cloudUniformsRef: ReturnType<typeof createCloudMaterial>['uniforms']
let atmosUniformsRef: ReturnType<typeof createAtmosphereMaterial>['uniforms']

// ---------------------------------------------------------------------------
// Post-processing state
// ---------------------------------------------------------------------------

let scenePass: any
let passes: any = {}
let rawNodes: any = {}
let dofFocusUniform: any
let dofApertureUniform: any
let dofMaxblurUniform: any
let postProcessingEnabled = true
let effectToggles = {
  bloom: true,
  anamorphic: false,
  dof: true,
}

// ---------------------------------------------------------------------------
// Planet category filter: 0=all, 1=rocky, 2=gas, 3=liquid
// ---------------------------------------------------------------------------

let categoryFilter = 0

// ---------------------------------------------------------------------------
// Post-processing pipeline
// ---------------------------------------------------------------------------

function initPasses() {
  const scenePassColor = scenePass.getTextureNode('output')
  const scenePassDepth = scenePass.getTextureNode('depth')

  // Bloom — high threshold so only HDR stars (>1.5) bloom
  const bloomNode = new BloomNode(nodeObject(scenePassColor), 0.7, 0.5, 1.5)
  passes.bloom = nodeObject(bloomNode as any)
  rawNodes.bloom = bloomNode

  // Anamorphic
  const anaThreshold = uniform(0.9)
  const anaScale = uniform(3.0)
  passes.anamorphic = anamorphic(scenePassColor, anaThreshold, anaScale, 32)
  rawNodes.anamorphic = { threshold: anaThreshold, scale: anaScale }

  // Depth of field (auto-focuses on planet via camera distance)
  const scenePassViewZ = scenePass.getViewZNode()
  dofFocusUniform = uniform(7.0)
  dofApertureUniform = uniform(0.0008)
  dofMaxblurUniform = uniform(0.003)
  passes.dof = dof(scenePassColor, scenePassViewZ, dofFocusUniform, dofApertureUniform, dofMaxblurUniform)
  rawNodes.dof = { focus: dofFocusUniform, aperture: dofApertureUniform, maxblur: dofMaxblurUniform }

  passes._scenePassColor = scenePassColor
}

function buildPostProcessing() {
  let result = passes._scenePassColor

  if (effectToggles.dof) result = passes.dof
  if (effectToggles.bloom) result = result.add(passes.bloom)
  if (effectToggles.anamorphic) result = result.add(passes.anamorphic)

  postProcessing.outputNode = result
  postProcessing.needsUpdate = true
}

export function toggleEffect(name: string, enabled: boolean) {
  (effectToggles as any)[name] = enabled
  buildPostProcessing()
}

export function togglePostProcessing(enabled: boolean) {
  postProcessingEnabled = enabled
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function applyPalette(palette: PlanetPalette) {
  const b = palette.biome
  const biomeKeys = [
    'deepOcean', 'midOcean', 'shallowWater', 'coast',
    'sand', 'sand2', 'savanna', 'savanna2',
    'grass', 'grass2', 'forest', 'forest2',
    'rock', 'rock2', 'snow', 'snowDirty',
  ] as const

  for (const key of biomeKeys) {
    (planetUniforms as any)[key].value.set(b[key])
  }

  planetUniforms.seaLevel.value = palette.seaLevel + (Math.random() - 0.5) * 0.08
  atmosUniformsRef.atmosphereColor.value.set(palette.atmosphere)
  atmosUniformsRef.twilightColor.value.set(palette.twilight)
  // Cloud color: palette base + subtle random variation
  cloudUniformsRef.cloudColor.value.set(palette.cloud)
  const hsl = { h: 0, s: 0, l: 0 }
  cloudUniformsRef.cloudColor.value.getHSL(hsl)
  hsl.h += (Math.random() - 0.5) * 0.06    // slight hue shift
  hsl.s = Math.min(1, hsl.s + Math.random() * 0.1)  // slightly more or less saturated
  hsl.l = Math.min(1, hsl.l * (0.85 + Math.random() * 0.3))  // brightness variation
  cloudUniformsRef.cloudColor.value.setHSL(hsl.h, hsl.s, hsl.l)
}

function pickCategory(): number {
  if (categoryFilter !== 0) return categoryFilter
  // Weighted random: 50% rocky, 25% gas, 25% liquid
  const r = Math.random()
  if (r < 0.5) return CATEGORY_ROCKY
  if (r < 0.75) return CATEGORY_GAS
  return CATEGORY_LIQUID
}

function randomizeRocky(palette: PlanetPalette) {
  const r = ROCKY_RANGES
  const s = SHARED_RANGES

  planetUniforms.noiseScale.value = randomWeighted(r.noiseScale)
  planetUniforms.seaLevel.value = randomWeighted(r.seaLevel)
  planetUniforms.lacunarity.value = randomInRange(r.lacunarity)
  planetUniforms.gain.value = randomInRange(r.gain)
  planetUniforms.terrainHeight.value = randomInRange(r.terrainHeight)
  planetUniforms.warpStrength.value = randomInRange(r.warpStrength)
  planetUniforms.ridgeStrength.value = randomInRange(r.ridgeStrength)
  planetUniforms.erosionStrength.value = randomInRange(r.erosionStrength)
  planetUniforms.moistureScale.value = randomInRange(r.moistureScale)
  planetUniforms.moistureOffset.value.set(
    randomInRange(s.moistureOffset),
    randomInRange(s.moistureOffset),
    randomInRange(s.moistureOffset)
  )
  planetUniforms.bumpStrength.value = randomInRange(r.bumpStrength)
  planetUniforms.terrainPower.value = randomInRange(r.terrainPower)
  planetUniforms.worleyBlend.value = randomInRange(r.worleyBlend)


  clouds.visible = true
  atmosphere.visible = true
  rings.visible = Math.random() < r.ringChance
}

function randomizeGas(palette: PlanetPalette) {
  const r = GAS_RANGES

  planetUniforms.noiseScale.value = randomInRange(r.noiseScale)
  planetUniforms.lacunarity.value = randomInRange(r.lacunarity)
  planetUniforms.gain.value = randomInRange(r.gain)
  planetUniforms.terrainHeight.value = 0
  planetUniforms.warpStrength.value = randomInRange(r.warpStrength)
  planetUniforms.ridgeStrength.value = 0
  planetUniforms.erosionStrength.value = 0
  clouds.visible = false
  atmosphere.visible = true
  rings.visible = Math.random() < r.ringChance
}

function randomizeLiquid(palette: PlanetPalette) {
  const r = LIQUID_RANGES

  planetUniforms.noiseScale.value = randomInRange(r.noiseScale)
  planetUniforms.lacunarity.value = randomInRange(r.lacunarity)
  planetUniforms.gain.value = randomInRange(r.gain)
  planetUniforms.terrainHeight.value = 0
  planetUniforms.warpStrength.value = randomInRange(r.warpStrength)
  planetUniforms.ridgeStrength.value = 0
  planetUniforms.erosionStrength.value = 0

  clouds.visible = true
  atmosphere.visible = true
  cloudUniformsRef.cloudOpacity.value = randomInRange(r.cloudOpacity)
  cloudUniformsRef.cloudDensity.value = randomInRange(r.cloudDensity)

  rings.visible = false
}

function randomizePlanet() {
  const s = SHARED_RANGES

  // Seed
  planetUniforms.seed.value.set(
    randomInRange(s.seed),
    randomInRange(s.seed),
    randomInRange(s.seed)
  )

  // Category
  const category = pickCategory()
  planetUniforms.planetCategory.value = category

  // Palette
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
  applyPalette(palette)

  // Category-specific parameters
  if (category === CATEGORY_ROCKY) randomizeRocky(palette)
  else if (category === CATEGORY_GAS) randomizeGas(palette)
  else randomizeLiquid(palette)

  // Shared cloud variation (only if clouds visible)
  if (clouds.visible) {
    cloudUniformsRef.cloudScale.value = randomInRange(s.cloudScale)
    cloudUniformsRef.cloudDensity.value = cloudUniformsRef.cloudDensity.value || 0.48
    cloudUniformsRef.cloudSharpness.value = randomInRange(s.cloudSharpness)
  }

  // Atmosphere variation
  atmosUniformsRef.glowIntensity.value = randomInRange(s.glowIntensity)
  atmosUniformsRef.glowCoefficient.value = randomInRange(s.glowCoefficient)
  atmosUniformsRef.glowPower.value = randomInRange(s.glowPower)

  // Planet size
  const sizeKey = category === CATEGORY_GAS ? 'gas' : 'rocky'
  const size = SIZE_RANGES[sizeKey]
  const baseScale = size.base + Math.random() * size.range
  const deformX = 1.0 + (Math.random() - 0.5) * size.deform
  const deformY = 'oblate' in size
    ? 1.0 - Math.random() * size.oblate!
    : 1.0 + (Math.random() - 0.5) * size.deform
  const deformZ = 1.0 + (Math.random() - 0.5) * size.deform
  planetGroup.scale.set(baseScale * deformX, baseScale * deformY, baseScale * deformZ)

  if (rings.visible) {
    const style = RING_STYLES[Math.floor(Math.random() * RING_STYLES.length)]
    applyRingStyle(style, palette)
  }

  // Axial tilt
  planetGroup.rotation.x = 0
  planetGroup.rotation.z = randomInRange(s.axialTilt)

  // Sun direction
  const sunAngle = randomInRange(s.sunAngle) * Math.PI
  const sunY = randomInRange(s.sunY)
  const sunDir = new Vector3(Math.cos(sunAngle) * 5, sunY * 5, Math.sin(sunAngle) * 5)
  sun.position.copy(sunDir)
  planetUniforms.sunDirection.value.copy(sunDir).normalize()
  sunFlare.position.copy(planetUniforms.sunDirection.value).multiplyScalar(50)

  // Sync GUI if active
  refreshGui()
}

// Exported so GUI can reuse same randomization
export { randomizePlanet }

function applyRingStyle(style: typeof RING_STYLES[number], palette: PlanetPalette) {
  rings.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3
  const styleKeys = [
    'bandFreq', 'bandFreq2',
    'gapPos1', 'gapWidth1', 'gapPos2', 'gapWidth2', 'gapPos3', 'gapWidth3',
    'innerTrim', 'outerTrim', 'densityVar',
  ] as const
  for (const key of styleKeys) {
    (ringUniformsRef as any)[key].value = style[key]
  }
  ringUniformsRef.ringOpacity.value = style.opacity
  ringUniformsRef.ringColor1.value.set(palette.biome.sand)
  ringUniformsRef.ringColor2.value.set(palette.biome.rock)
  ringUniformsRef.ringColor3.value.set(palette.biome.snowDirty)
}

function createRandomizeBar() {
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
    categoryFilter = Number(select.value)
  })

  const btn = document.createElement('button')
  btn.textContent = 'Randomize'
  btn.className = 'randomize-btn'
  btn.addEventListener('click', randomizePlanet)

  bar.appendChild(select)
  bar.appendChild(btn)
  document.body.appendChild(bar)
}

// ---------------------------------------------------------------------------
// Config read / apply — exact planet reproduction
// ---------------------------------------------------------------------------

export function readConfig(): PlanetConfig {
  const p = planetUniforms
  const c = cloudUniformsRef
  const a = atmosUniformsRef
  const r = ringUniformsRef

  return {
    category: p.planetCategory.value,
    seed: { x: p.seed.value.x, y: p.seed.value.y, z: p.seed.value.z },
    terrain: {
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
      moistureOffset: { x: p.moistureOffset.value.x, y: p.moistureOffset.value.y, z: p.moistureOffset.value.z },
      bumpStrength: p.bumpStrength.value,
      worleyBlend: p.worleyBlend.value,
    },
    biome: {
      deepOcean: p.deepOcean.value.getHex(),
      midOcean: p.midOcean.value.getHex(),
      shallowWater: p.shallowWater.value.getHex(),
      coast: p.coast.value.getHex(),
      sand: p.sand.value.getHex(),
      sand2: p.sand2.value.getHex(),
      savanna: p.savanna.value.getHex(),
      savanna2: p.savanna2.value.getHex(),
      grass: p.grass.value.getHex(),
      grass2: p.grass2.value.getHex(),
      forest: p.forest.value.getHex(),
      forest2: p.forest2.value.getHex(),
      rock: p.rock.value.getHex(),
      rock2: p.rock2.value.getHex(),
      snow: p.snow.value.getHex(),
      snowDirty: p.snowDirty.value.getHex(),
    },
    clouds: {
      visible: clouds.visible,
      scale: c.cloudScale.value,
      density: c.cloudDensity.value,
      sharpness: c.cloudSharpness.value,
      opacity: c.cloudOpacity.value,
      color: c.cloudColor.value.getHex(),
    },
    atmosphere: {
      visible: atmosphere.visible,
      color: a.atmosphereColor.value.getHex(),
      twilightColor: a.twilightColor.value.getHex(),
      glowIntensity: a.glowIntensity.value,
      glowCoefficient: a.glowCoefficient.value,
      glowPower: a.glowPower.value,
    },
    rings: {
      visible: rings.visible,
      colors: [r.ringColor1.value.getHex(), r.ringColor2.value.getHex(), r.ringColor3.value.getHex()],
      opacity: r.ringOpacity.value,
      bandFreq: r.bandFreq.value,
      bandFreq2: r.bandFreq2.value,
      gaps: [
        r.gapPos1.value, r.gapWidth1.value,
        r.gapPos2.value, r.gapWidth2.value,
        r.gapPos3.value, r.gapWidth3.value,
      ],
      innerTrim: r.innerTrim.value,
      outerTrim: r.outerTrim.value,
      densityVar: r.densityVar.value,
      rotationX: rings.rotation.x,
    },
    transform: {
      scale: { x: planetGroup.scale.x, y: planetGroup.scale.y, z: planetGroup.scale.z },
      axialTilt: planetGroup.rotation.z,
    },
    lighting: {
      sunDirection: { x: p.sunDirection.value.x, y: p.sunDirection.value.y, z: p.sunDirection.value.z },
    },
  }
}

export function applyConfig(cfg: PlanetConfig) {
  const p = planetUniforms
  const c = cloudUniformsRef
  const a = atmosUniformsRef
  const r = ringUniformsRef

  // Category & seed
  p.planetCategory.value = cfg.category
  p.seed.value.set(cfg.seed.x, cfg.seed.y, cfg.seed.z)

  // Terrain
  p.noiseScale.value = cfg.terrain.noiseScale
  p.lacunarity.value = cfg.terrain.lacunarity
  p.gain.value = cfg.terrain.gain
  p.terrainHeight.value = cfg.terrain.terrainHeight
  p.seaLevel.value = cfg.terrain.seaLevel
  p.warpStrength.value = cfg.terrain.warpStrength
  p.ridgeStrength.value = cfg.terrain.ridgeStrength
  p.erosionStrength.value = cfg.terrain.erosionStrength
  p.terrainPower.value = cfg.terrain.terrainPower
  p.moistureScale.value = cfg.terrain.moistureScale
  p.moistureOffset.value.set(cfg.terrain.moistureOffset.x, cfg.terrain.moistureOffset.y, cfg.terrain.moistureOffset.z)
  p.bumpStrength.value = cfg.terrain.bumpStrength
  p.worleyBlend.value = cfg.terrain.worleyBlend

  // Biome colors
  const biomeKeys = [
    'deepOcean', 'midOcean', 'shallowWater', 'coast',
    'sand', 'sand2', 'savanna', 'savanna2',
    'grass', 'grass2', 'forest', 'forest2',
    'rock', 'rock2', 'snow', 'snowDirty',
  ] as const
  for (const key of biomeKeys) {
    (p as any)[key].value.set(cfg.biome[key])
  }

  // Clouds
  clouds.visible = cfg.clouds.visible
  c.cloudScale.value = cfg.clouds.scale
  c.cloudDensity.value = cfg.clouds.density
  c.cloudSharpness.value = cfg.clouds.sharpness
  c.cloudOpacity.value = cfg.clouds.opacity
  c.cloudColor.value.set(cfg.clouds.color)

  // Atmosphere
  atmosphere.visible = cfg.atmosphere.visible
  a.atmosphereColor.value.set(cfg.atmosphere.color)
  a.twilightColor.value.set(cfg.atmosphere.twilightColor)
  a.glowIntensity.value = cfg.atmosphere.glowIntensity
  a.glowCoefficient.value = cfg.atmosphere.glowCoefficient
  a.glowPower.value = cfg.atmosphere.glowPower

  // Rings
  rings.visible = cfg.rings.visible
  r.ringColor1.value.set(cfg.rings.colors[0])
  r.ringColor2.value.set(cfg.rings.colors[1])
  r.ringColor3.value.set(cfg.rings.colors[2])
  r.ringOpacity.value = cfg.rings.opacity
  r.bandFreq.value = cfg.rings.bandFreq
  r.bandFreq2.value = cfg.rings.bandFreq2
  r.gapPos1.value = cfg.rings.gaps[0]
  r.gapWidth1.value = cfg.rings.gaps[1]
  r.gapPos2.value = cfg.rings.gaps[2]
  r.gapWidth2.value = cfg.rings.gaps[3]
  r.gapPos3.value = cfg.rings.gaps[4]
  r.gapWidth3.value = cfg.rings.gaps[5]
  r.innerTrim.value = cfg.rings.innerTrim
  r.outerTrim.value = cfg.rings.outerTrim
  r.densityVar.value = cfg.rings.densityVar
  rings.rotation.x = cfg.rings.rotationX

  // Transform
  planetGroup.scale.set(cfg.transform.scale.x, cfg.transform.scale.y, cfg.transform.scale.z)
  planetGroup.rotation.x = 0
  planetGroup.rotation.z = cfg.transform.axialTilt

  // Lighting
  const sunDir = new Vector3(cfg.lighting.sunDirection.x, cfg.lighting.sunDirection.y, cfg.lighting.sunDirection.z)
  p.sunDirection.value.copy(sunDir).normalize()
  sun.position.copy(sunDir.normalize().multiplyScalar(5))
  sunFlare.position.copy(p.sunDirection.value).multiplyScalar(50)
  refreshGui()
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export async function init() {
  // Core
  scene = new Scene()
  scene.background = new Color(0x000005)
  camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
  const isMobile = window.innerWidth < 768
  camera.position.set(0, 0, isMobile ? 8 : 5)

  // Renderer
  renderer = new WebGPURenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = 6 // AgXToneMapping
  renderer.toneMappingExposure = 1.4
  document.body.appendChild(renderer.domElement)
  await renderer.init()

  // Post-processing
  postProcessing = new PostProcessing(renderer)
  scenePass = pass(scene, camera)
  initPasses()
  buildPostProcessing()

  // Stats (dev only)
  if (__DEV__) {
    stats = new Stats({ trackGPU: false })
    await stats.init(renderer)
    document.body.appendChild(stats.dom)
    stats.dom.style.cssText = 'position:absolute;left:0;top:0;z-index:100'
  }

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = false
  controls.rotateSpeed = 0.5
  controls.zoomSpeed = 0.5
  controls.minDistance = 2
  controls.maxDistance = 14

  // Lighting
  sun = new DirectionalLight(0xffffff, 1.8)
  sun.position.set(5, 3, 5)
  scene.add(sun)
  scene.add(new AmbientLight(0x404060, 0.3))

  // Sun glow — bright HDR point, bloom creates the flare effect
  sunFlare = createSunFlare()
  sunFlare.position.copy(new Vector3().copy(sun.position).normalize().multiplyScalar(50))
  scene.add(sunFlare)

  // Stars
  scene.add(createStarfield())

  // Planet group (shared scale/deformation)
  planetGroup = new Group()
  scene.add(planetGroup)

  const planetResult = createPlanetMaterial()
  planetUniforms = planetResult.uniforms
  planet = new Mesh(new SphereGeometry(1, 96, 96), planetResult.material)
  planetGroup.add(planet)

  // Atmosphere
  const { material: atmosMat, uniforms: atmosUniforms } = createAtmosphereMaterial(planetUniforms)
  atmosUniformsRef = atmosUniforms

  // Clouds
  const { material: cloudMat, uniforms: cloudUniforms } = createCloudMaterial(planetUniforms, atmosUniforms)
  cloudUniformsRef = cloudUniforms
  clouds = new Mesh(new SphereGeometry(1.06, 64, 64), cloudMat)
  planetGroup.add(clouds)
  atmosphere = new Mesh(new SphereGeometry(1.09, 64, 64), atmosMat)
  planetGroup.add(atmosphere)
  applyInnerGlow(planetResult.material, planetUniforms, atmosUniforms)

  // Rings
  const { material: ringMat, uniforms: ringUniforms } = createRingMaterial(planetUniforms)
  ringUniformsRef = ringUniforms
  rings = new Mesh(new RingGeometry(1.4, 2.4, 96, 8), ringMat)
  rings.rotation.x = Math.PI / 2  // flat on equatorial plane
  rings.visible = false            // off by default
  planetGroup.add(rings)

  // GUI — hidden by default, toggle with 'o' key
  const guiRef = setupGui(planetUniforms, atmosUniforms, cloudUniforms, { passes, rawNodes, renderer, toggleEffect, togglePostProcessing, effectToggles, postProcessingEnabled }, { clouds, atmosphere }, randomizePlanet)
  if (guiRef && !__DEV__) guiRef.hide()
  window.addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') {
      if (guiRef) guiRef._hidden ? guiRef.show() : guiRef.hide()
    }
  })

  // Randomize button
  createRandomizeBar()

  window.addEventListener('resize', onResize)
  renderer.setAnimationLoop(animate)
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function animate() {
  planet.rotation.y += 0.00067
  clouds.rotation.y += 0.001
  atmosphere.rotation.y += 0.00067

  cloudUniformsRef.uTime.value += 0.016

  controls.update()
  sunFlare.lookAt(camera.position)
  if (dofFocusUniform) dofFocusUniform.value = camera.position.length()
  if (postProcessingEnabled) {
    postProcessing.render()
  } else {
    renderer.render(scene, camera)
  }

  if (__DEV__ && stats) stats.update()
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
