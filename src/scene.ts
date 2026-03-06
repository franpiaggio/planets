import {
  PerspectiveCamera, Scene, Color, SphereGeometry, Mesh, WebGPURenderer,
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
import { setupGui } from './gui'
import { createStarfield } from './stars'

// ---------------------------------------------------------------------------
// Scene state
// ---------------------------------------------------------------------------

let camera: PerspectiveCamera
let scene: Scene
let renderer: WebGPURenderer
let postProcessing: PostProcessing
let controls: OrbitControls
let stats: Stats
let planet: Mesh
let clouds: Mesh
let atmosphere: Mesh
let planetUniforms: ReturnType<typeof createPlanetMaterial>['uniforms']
let cloudUniformsRef: ReturnType<typeof createCloudMaterial>['uniforms']

// ---------------------------------------------------------------------------
// Post-processing state
// ---------------------------------------------------------------------------

let scenePass: any
let passes: any = {}
let rawNodes: any = {}
let dofFocusUniform: any
let dofApertureUniform: any
let dofMaxblurUniform: any
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
  dofMaxblurUniform = uniform(0.006)
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

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function createRandomizeButton(uniforms: typeof planetUniforms) {
  const btn = document.createElement('button')
  btn.textContent = 'Randomize'
  btn.className = 'randomize-btn'
  btn.addEventListener('click', () => {
    uniforms.seed.value.set(
      Math.random() * 100 - 50,
      Math.random() * 100 - 50,
      Math.random() * 100 - 50
    )
  })
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
  camera.position.set(0, 0, 7)

  // Renderer
  renderer = new WebGPURenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = 6 // AgXToneMapping
  renderer.toneMappingExposure = 1.1
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
  controls.minDistance = 2
  controls.maxDistance = 10

  // Lighting
  const sun = new DirectionalLight(0xffffff, 2.0)
  sun.position.set(5, 3, 5)
  scene.add(sun)
  scene.add(new AmbientLight(0x404060, 0.3))

  // Stars
  scene.add(createStarfield())

  // Planet
  const planetResult = createPlanetMaterial()
  planetUniforms = planetResult.uniforms
  planet = new Mesh(new SphereGeometry(1, 96, 96), planetResult.material)
  scene.add(planet)

  // Atmosphere
  const { material: atmosMat, uniforms: atmosUniforms } = createAtmosphereMaterial(planetUniforms)

  // Clouds
  const { material: cloudMat, uniforms: cloudUniforms } = createCloudMaterial(planetUniforms, atmosUniforms)
  cloudUniformsRef = cloudUniforms
  clouds = new Mesh(new SphereGeometry(1.06, 64, 64), cloudMat)
  scene.add(clouds)
  atmosphere = new Mesh(new SphereGeometry(1.09, 64, 64), atmosMat)
  scene.add(atmosphere)
  applyInnerGlow(planetResult.material, planetUniforms, atmosUniforms)

  // GUI (dev only)
  if (__DEV__) {
    setupGui(planetUniforms, atmosUniforms, cloudUniforms, { passes, rawNodes, renderer, toggleEffect, effectToggles })
  }

  // Randomize button
  createRandomizeButton(planetUniforms)

  window.addEventListener('resize', onResize)
  renderer.setAnimationLoop(animate)
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function animate() {
  planet.rotation.y += 0.002
  clouds.rotation.y += 0.003
  atmosphere.rotation.y += 0.002

  planetUniforms.cloudRotationY.value = clouds.rotation.y - planet.rotation.y
  cloudUniformsRef.uTime.value += 0.016

  controls.update()
  if (dofFocusUniform) dofFocusUniform.value = camera.position.length()
  postProcessing.render()

  if (__DEV__ && stats) stats.update()
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
