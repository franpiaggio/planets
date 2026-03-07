import {
  PerspectiveCamera, Scene, Color, SphereGeometry, RingGeometry, Mesh, Group, WebGPURenderer,
  DirectionalLight, AmbientLight, PostProcessing, Vector3
} from 'three/webgpu'
import { pass, mrt, output, normalView, metalness, uniform, nodeObject } from 'three/tsl'
import BloomNode from 'three/addons/tsl/display/BloomNode.js'
import { anamorphic } from 'three/addons/tsl/display/AnamorphicNode.js'
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js'
import { ao } from 'three/addons/tsl/display/GTAONode.js'
import { ssr } from 'three/addons/tsl/display/SSRNode.js'
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
  ao: false,
  ssr: false,
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
  const scenePassNormal = scenePass.getTextureNode('normal')
  const scenePassMetalness = scenePass.getTextureNode('metalness')

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

  // AO & SSR
  passes.ao = ao(scenePassDepth, scenePassNormal, camera)
  passes.ssr = ssr(scenePassColor, scenePassDepth, scenePassNormal, scenePassMetalness, camera)

  passes._scenePassColor = scenePassColor
}

function buildPostProcessing() {
  let result = passes._scenePassColor

  if (effectToggles.ao) result = result.mul(passes.ao.getTextureNode())
  if (effectToggles.ssr) result = passes.ssr
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
  cloudUniformsRef.cloudColor.value.set(palette.cloud)
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
  planetUniforms.noiseScale.value = 2.2 + (Math.random() - 0.5) * 1.0       // 1.7–2.7
  planetUniforms.lacunarity.value = 2.05 + (Math.random() - 0.5) * 0.5      // 1.80–2.30
  planetUniforms.gain.value = 0.45 + (Math.random() - 0.5) * 0.2            // 0.35–0.55
  planetUniforms.terrainHeight.value = 0.15 + (Math.random() - 0.5) * 0.1   // 0.1–0.2
  planetUniforms.warpStrength.value = 0.55 + (Math.random() - 0.5) * 0.4    // 0.35–0.75
  planetUniforms.ridgeStrength.value = 0.12 + (Math.random() - 0.5) * 0.12  // 0.06–0.18
  planetUniforms.erosionStrength.value = Math.random() * 0.7                 // 0.0–0.7
  planetUniforms.moistureScale.value = 1.2 + Math.random() * 1.6             // 1.2–2.8
  planetUniforms.moistureOffset.value.set(
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50
  )
  planetUniforms.bumpStrength.value = 0.4 + Math.random() * 0.5             // 0.4–0.9
  planetUniforms.terrainPower.value = 1.2 + Math.random() * 0.8             // 1.2–2.0
  planetUniforms.worleyBlend.value = 0.1 + Math.random() * 0.25            // 0.1–0.35

  clouds.visible = true
  atmosphere.visible = true
  rings.visible = Math.random() > 0.85
}

function randomizeGas(palette: PlanetPalette) {
  planetUniforms.noiseScale.value = 1.5 + Math.random() * 1.5               // 1.5–3.0
  planetUniforms.lacunarity.value = 1.92 + (Math.random() - 0.5) * 0.4
  planetUniforms.gain.value = 0.4 + Math.random() * 0.2
  planetUniforms.terrainHeight.value = 0                                     // no displacement
  planetUniforms.warpStrength.value = 0.6 + Math.random() * 0.8             // more turbulence
  planetUniforms.ridgeStrength.value = 0
  planetUniforms.erosionStrength.value = 0

  clouds.visible = false       // surface IS the atmosphere
  atmosphere.visible = true
  rings.visible = Math.random() > 0.5  // gas giants often have rings
}

function randomizeLiquid(palette: PlanetPalette) {
  planetUniforms.noiseScale.value = 2.0 + (Math.random() - 0.5) * 1.0
  planetUniforms.lacunarity.value = 1.92 + (Math.random() - 0.5) * 0.4
  planetUniforms.gain.value = 0.45 + (Math.random() - 0.5) * 0.2
  planetUniforms.terrainHeight.value = 0                                     // no displacement
  planetUniforms.warpStrength.value = 0.4 + Math.random() * 0.4
  planetUniforms.ridgeStrength.value = 0
  planetUniforms.erosionStrength.value = 0

  clouds.visible = true
  atmosphere.visible = true
  cloudUniformsRef.cloudOpacity.value = 0.5 + Math.random() * 0.3           // heavy clouds
  cloudUniformsRef.cloudDensity.value = 0.4 + Math.random() * 0.15
  rings.visible = false
}

function randomizePlanet() {
  // Seed
  planetUniforms.seed.value.set(
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50
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
    cloudUniformsRef.cloudScale.value = 3.0 + (Math.random() - 0.5) * 2.0
    cloudUniformsRef.cloudDensity.value = cloudUniformsRef.cloudDensity.value || 0.48
    cloudUniformsRef.cloudSharpness.value = 3.0 + (Math.random() - 0.5) * 2.0
  }

  // Atmosphere variation
  atmosUniformsRef.glowIntensity.value = 0.5 + (Math.random() - 0.5) * 0.3
  atmosUniformsRef.glowCoefficient.value = 0.55 + (Math.random() - 0.5) * 0.2
  atmosUniformsRef.glowPower.value = 8.0 + (Math.random() - 0.5) * 3.0

  // Planet size — gas giants tend to be bigger
  const sizeBase = category === CATEGORY_GAS ? 1.0 : 0.6
  const sizeRange = category === CATEGORY_GAS ? 0.6 : 0.8
  const baseScale = sizeBase + Math.random() * sizeRange
  const deformX = 1.0 + (Math.random() - 0.5) * 0.12
  const deformY = category === CATEGORY_GAS
    ? 1.0 - Math.random() * 0.08   // gas giants are oblate
    : 1.0 + (Math.random() - 0.5) * 0.12
  const deformZ = 1.0 + (Math.random() - 0.5) * 0.12
  planetGroup.scale.set(baseScale * deformX, baseScale * deformY, baseScale * deformZ)

  if (rings.visible) {
    const style = RING_STYLES[Math.floor(Math.random() * RING_STYLES.length)]
    applyRingStyle(style, palette)
  }

  // Axial tilt — only Z axis (side lean), never flipping toward/away from camera
  planetGroup.rotation.x = 0
  planetGroup.rotation.z = (Math.random() - 0.5) * 0.52                    // ±15°

  // Sun direction — always from camera side, vary left/right
  const sunAngle = (Math.random() - 0.5) * Math.PI * 0.8                   // ±72° from center
  const sunY = 0.2 + (Math.random() - 0.5) * 0.3                           // 0.05–0.35, never top/bottom
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
  scenePass.setMRT(mrt({ output, normal: normalView, metalness }))
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

  planetUniforms.cloudRotationY.value = clouds.rotation.y - planet.rotation.y
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
