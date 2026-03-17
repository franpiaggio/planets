// ---------------------------------------------------------------------------
// Scene — initialization, render loop, resize
// ---------------------------------------------------------------------------

import {
  PerspectiveCamera, Scene, Color, SphereGeometry, RingGeometry, Mesh, Group, WebGPURenderer,
  DirectionalLight, AmbientLight, Vector3
} from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'stats-gl'
import { createPlanetMaterial } from './shaders/planet'
import { createAtmosphereMaterial, applyInnerGlow } from './shaders/atmosphere'
import { createCloudMaterial } from './shaders/clouds'
import { createRingMaterial } from './shaders/rings'
import { setupGui } from './gui'
import { createStarfield } from './stars'
import { createSunFlare } from './lensflare'
import { createPostProcessing, toggleEffect, togglePostProcessing } from './postProcessing'
import type { PostProcessingState } from './postProcessing'
import { randomizePlanet, createRandomizeBar } from './planetGenerator'
import { readConfig, applyConfig } from './configManager'
import type { SceneRefs } from './sceneRefs'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let camera: PerspectiveCamera
let scene: Scene
let renderer: WebGPURenderer
let controls: OrbitControls
let stats: Stats
let pp: PostProcessingState
let refs: SceneRefs

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
  pp = createPostProcessing(renderer, scene, camera)

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
  const sun = new DirectionalLight(0xffffff, 1.8)
  sun.position.set(5, 3, 5)
  scene.add(sun)
  scene.add(new AmbientLight(0x404060, 0.3))

  const sunFlare = createSunFlare()
  sunFlare.position.copy(new Vector3().copy(sun.position).normalize().multiplyScalar(50))
  scene.add(sunFlare)

  // Stars
  scene.add(createStarfield())

  // Planet group
  const planetGroup = new Group()
  scene.add(planetGroup)

  // Planet
  const planetResult = createPlanetMaterial()
  const planet = new Mesh(new SphereGeometry(1, 96, 96), planetResult.material)
  planetGroup.add(planet)

  // Atmosphere
  const { material: atmosMat, uniforms: atmosUniforms } = createAtmosphereMaterial(planetResult.uniforms)

  // Clouds
  const { material: cloudMat, uniforms: cloudUniforms } = createCloudMaterial(planetResult.uniforms, atmosUniforms)
  const clouds = new Mesh(new SphereGeometry(1.06, 64, 64), cloudMat)
  planetGroup.add(clouds)

  const atmosphere = new Mesh(new SphereGeometry(1.09, 64, 64), atmosMat)
  planetGroup.add(atmosphere)

  // Inner glow on each planet material variant (rocky, gas, liquid)
  for (const mat of Object.values(planetResult.materials)) {
    applyInnerGlow(mat, planetResult.uniforms, atmosUniforms)
  }

  // Rings
  const { material: ringMat, uniforms: ringUniforms } = createRingMaterial(planetResult.uniforms)
  const rings = new Mesh(new RingGeometry(1.4, 2.4, 96, 8), ringMat)
  rings.rotation.x = Math.PI / 2
  rings.visible = false
  planetGroup.add(rings)

  // Build shared refs
  refs = {
    planet,
    clouds,
    atmosphere,
    rings,
    planetGroup,
    sun,
    sunFlare,
    planetUniforms: planetResult.uniforms,
    planetMaterials: planetResult.materials,
    cloudUniforms,
    atmosUniforms,
    ringUniforms,
  }

  // GUI
  const guiRef = setupGui(
    planetResult.uniforms, atmosUniforms, cloudUniforms, planetResult.uniforms as any,
    {
      passes: pp.passes, rawNodes: pp.rawNodes as any, renderer,
      toggleEffect: (name: string, enabled: boolean) => toggleEffect(pp, name, enabled),
      togglePostProcessing: (enabled: boolean) => togglePostProcessing(pp, enabled),
      effectToggles: pp.effectToggles, postProcessingEnabled: pp.enabled,
    },
    { clouds, atmosphere },
    () => randomizePlanet(refs),
  )
  if (guiRef && !__DEV__) guiRef.hide()
  window.addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') {
      if (guiRef) guiRef._hidden ? guiRef.show() : guiRef.hide()
    }
    if (e.key === 'r' || e.key === 'R') {
      randomizePlanet(refs)
    }
  })

  // Randomize bar
  createRandomizeBar(refs)

  window.addEventListener('resize', onResize)
  renderer.setAnimationLoop(animate)
}

// ---------------------------------------------------------------------------
// Exports for external access (config, randomize)
// ---------------------------------------------------------------------------

export function getRandomizePlanet() {
  return () => randomizePlanet(refs)
}

export function getReadConfig() {
  return () => readConfig(refs)
}

export function getApplyConfig() {
  return (cfg: any) => applyConfig(refs, cfg)
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

function animate() {
  refs.planet.rotation.y += 0.00067
  refs.clouds.rotation.y += 0.00067
  refs.atmosphere.rotation.y += 0.00067

  refs.cloudUniforms.uTime.value += 0.015

  controls.update()
  refs.sunFlare.lookAt(camera.position)
  if (pp.dofFocusUniform) pp.dofFocusUniform.value = camera.position.length()

  if (pp.enabled) {
    pp.postProcessing.render()
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
