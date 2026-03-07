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
import { createPlanetMaterial } from './shaders/planet'
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

function randomizePlanet() {
  // Seed
  planetUniforms.seed.value.set(
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50
  )

  // Palette
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
  applyPalette(palette)

  // Subtle noise variation around defaults
  planetUniforms.noiseScale.value = 2.2 + (Math.random() - 0.5) * 1.0       // 1.7–2.7
  planetUniforms.lacunarity.value = 1.92 + (Math.random() - 0.5) * 0.5      // 1.67–2.17
  planetUniforms.gain.value = 0.45 + (Math.random() - 0.5) * 0.2            // 0.35–0.55
  planetUniforms.terrainHeight.value = 0.15 + (Math.random() - 0.5) * 0.1   // 0.1–0.2
  planetUniforms.warpStrength.value = 0.55 + (Math.random() - 0.5) * 0.4    // 0.35–0.75
  planetUniforms.ridgeStrength.value = 0.12 + (Math.random() - 0.5) * 0.12  // 0.06–0.18
  planetUniforms.erosionStrength.value = Math.random() * 0.7                // 0.0–0.7

  // Subtle cloud variation
  cloudUniformsRef.cloudScale.value = 3.0 + (Math.random() - 0.5) * 2.0     // 2.0–4.0
  cloudUniformsRef.cloudDensity.value = 0.48 + (Math.random() - 0.5) * 0.15 // 0.4–0.56
  cloudUniformsRef.cloudSharpness.value = 3.0 + (Math.random() - 0.5) * 2.0 // 2.0–4.0
  cloudUniformsRef.cloudOpacity.value = 0.45 + (Math.random() - 0.5) * 0.2  // 0.35–0.55

  // Subtle atmosphere variation
  atmosUniformsRef.glowIntensity.value = 0.5 + (Math.random() - 0.5) * 0.3  // 0.35–0.65
  atmosUniformsRef.glowCoefficient.value = 0.55 + (Math.random() - 0.5) * 0.2 // 0.45–0.65
  atmosUniformsRef.glowPower.value = 8.0 + (Math.random() - 0.5) * 3.0      // 6.5–9.5

  // Planet size and shape
  const baseScale = 0.6 + Math.random() * 0.8                               // 0.6–1.4
  const deformX = 1.0 + (Math.random() - 0.5) * 0.12                        // 0.94–1.06
  const deformY = 1.0 + (Math.random() - 0.5) * 0.12                        // oblate/prolate
  const deformZ = 1.0 + (Math.random() - 0.5) * 0.12
  planetGroup.scale.set(baseScale * deformX, baseScale * deformY, baseScale * deformZ)

  // Always show atmosphere and clouds
  atmosphere.visible = true
  clouds.visible = true

  // ~20% of planets get rings
  rings.visible = Math.random() > 0.8
  if (rings.visible) {
    // Vary ring tilt slightly from equatorial
    rings.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3

    // Pick a random ring style
    const style = RING_STYLES[Math.floor(Math.random() * RING_STYLES.length)]
    ringUniformsRef.bandFreq.value = style.bandFreq
    ringUniformsRef.bandFreq2.value = style.bandFreq2
    ringUniformsRef.gapPos1.value = style.gapPos1
    ringUniformsRef.gapWidth1.value = style.gapWidth1
    ringUniformsRef.gapPos2.value = style.gapPos2
    ringUniformsRef.gapWidth2.value = style.gapWidth2
    ringUniformsRef.gapPos3.value = style.gapPos3
    ringUniformsRef.gapWidth3.value = style.gapWidth3
    ringUniformsRef.innerTrim.value = style.innerTrim
    ringUniformsRef.outerTrim.value = style.outerTrim
    ringUniformsRef.densityVar.value = style.densityVar
    ringUniformsRef.ringOpacity.value = style.opacity

    // Colors from palette
    const b = palette.biome
    ringUniformsRef.ringColor1.value.set(b.sand)
    ringUniformsRef.ringColor2.value.set(b.rock)
    ringUniformsRef.ringColor3.value.set(b.snowDirty)
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

function createRandomizeButton() {
  const btn = document.createElement('button')
  btn.textContent = 'Randomize'
  btn.className = 'randomize-btn'
  btn.addEventListener('click', randomizePlanet)
  document.body.appendChild(btn)
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
  const guiRef = setupGui(planetUniforms, atmosUniforms, cloudUniforms, { passes, rawNodes, renderer, toggleEffect, togglePostProcessing, effectToggles, postProcessingEnabled }, { clouds, atmosphere })
  if (guiRef && !__DEV__) guiRef.hide()
  window.addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') {
      if (guiRef) guiRef._hidden ? guiRef.show() : guiRef.hide()
    }
  })

  // Randomize button
  createRandomizeButton()

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
