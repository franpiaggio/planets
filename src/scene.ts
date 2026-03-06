import {
  PerspectiveCamera, Scene, Color, SphereGeometry, Mesh, WebGPURenderer,
  DirectionalLight, AmbientLight, PostProcessing, Vector3
} from 'three/webgpu'
import { pass, mrt, output, normalView, metalness, uniform } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
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

let camera: PerspectiveCamera
let scene: Scene
let renderer: WebGPURenderer
let postProcessing: any
let controls: OrbitControls
let stats: Stats
let planet: Mesh
let clouds: Mesh
let atmosphere: Mesh
let planetUniforms: ReturnType<typeof createPlanetMaterial>['uniforms']

// Post-processing state
let scenePass: any
let passes: any = {}
let effectToggles = {
  bloom: true,
  anamorphic: false,
  dof: false,
  ao: false,
  ssr: false,
}

function initPasses() {
  const scenePassColor = scenePass.getTextureNode('output')
  const scenePassDepth = scenePass.getTextureNode('depth')
  const scenePassNormal = scenePass.getTextureNode('normal')
  const scenePassMetalness = scenePass.getTextureNode('metalness')

  // Pre-create all passes with uniforms so GUI can modify parameters at runtime
  passes.bloom = bloom(scenePassColor, 0.4, 0.4, 0.2)

  const anaThreshold = uniform(0.9)
  const anaScale = uniform(3.0)
  passes.anamorphic = anamorphic(scenePassColor, anaThreshold, anaScale, 32)
  passes.anamorphic._thresholdUniform = anaThreshold
  passes.anamorphic._scaleUniform = anaScale

  const dofFocus = uniform(4.0)
  const dofAperture = uniform(0.01)
  const dofMaxblur = uniform(0.5)
  passes.dof = dof(scenePassColor, scenePassDepth, dofFocus, dofAperture, dofMaxblur)
  passes.dof._focusUniform = dofFocus
  passes.dof._apertureUniform = dofAperture
  passes.dof._maxblurUniform = dofMaxblur
  passes.ao = ao(scenePassDepth, scenePassNormal, camera)
  passes.ssr = ssr(scenePassColor, scenePassDepth, scenePassNormal, scenePassMetalness, camera)

  passes._scenePassColor = scenePassColor
}

function buildPostProcessing() {
  let result = passes._scenePassColor

  if (effectToggles.ao) {
    result = result.mul(passes.ao.getTextureNode())
  }

  if (effectToggles.ssr) {
    result = passes.ssr
  }

  if (effectToggles.bloom) {
    result = result.add(passes.bloom)
  }

  if (effectToggles.anamorphic) {
    result = result.add(passes.anamorphic)
  }

  if (effectToggles.dof) {
    result = passes.dof
  }

  postProcessing.outputNode = result
  postProcessing.needsUpdate = true
}

export function toggleEffect(name: string, enabled: boolean) {
  (effectToggles as any)[name] = enabled
  buildPostProcessing()
}

export async function init() {
  scene = new Scene()
  scene.background = new Color(0x000005)

  camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(0, 0, 4)

  renderer = new WebGPURenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = 6 // AgXToneMapping
  renderer.toneMappingExposure = 1.1
  document.body.appendChild(renderer.domElement)
  await renderer.init()

  // Post-processing setup with MRT for AO/SSR
  postProcessing = new PostProcessing(renderer)
  scenePass = pass(scene, camera)
  scenePass.setMRT(mrt({
    output,
    normal: normalView,
    metalness,
  }))

  initPasses()
  buildPostProcessing()

  // Stats panel (dev only)
  if (__DEV__) {
    stats = new Stats({ trackGPU: false })
    await stats.init(renderer)
    document.body.appendChild(stats.dom)
    stats.dom.style.position = 'absolute'
    stats.dom.style.left = '0px'
    stats.dom.style.top = '0px'
    stats.dom.style.zIndex = '100'
  }

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
  scene.add(createStarfield(25000, 50))

  // Planet
  const planetResult = createPlanetMaterial()
  planetUniforms = planetResult.uniforms
  planet = new Mesh(new SphereGeometry(1, 128, 128), planetResult.material)
  scene.add(planet)

  // Atmosphere
  const { material: atmosMat, uniforms: atmosUniforms } = createAtmosphereMaterial(planetUniforms)

  // Clouds
  const { material: cloudMat, uniforms: cloudUniforms } = createCloudMaterial(planetUniforms, atmosUniforms)
  clouds = new Mesh(new SphereGeometry(1.06, 64, 64), cloudMat)
  scene.add(clouds)
  atmosphere = new Mesh(new SphereGeometry(1.09, 64, 64), atmosMat)
  scene.add(atmosphere)
  applyInnerGlow(planetResult.material, planetUniforms, atmosUniforms)

  // GUI (dev only)
  if (__DEV__) {
    const postUniforms = { passes, renderer, toggleEffect, effectToggles }
    setupGui(planetUniforms, atmosUniforms, cloudUniforms, postUniforms)
  }

  // Randomize seed button
  const btn = document.createElement('button')
  btn.textContent = 'Randomize'
  btn.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 28px;font-size:16px;font-weight:600;border:none;border-radius:8px;background:rgba(255,255,255,0.12);color:#fff;cursor:pointer;backdrop-filter:blur(8px);z-index:100;transition:background 0.2s'
  btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.22)' })
  btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,255,255,0.12)' })
  btn.addEventListener('click', () => {
    const s = new Vector3(
      Math.random() * 100 - 50,
      Math.random() * 100 - 50,
      Math.random() * 100 - 50
    )
    planetUniforms.seed.value.copy(s)
  })
  document.body.appendChild(btn)

  window.addEventListener('resize', onResize)
  renderer.setAnimationLoop(animate)
}

function animate() {
  planet.rotation.y += 0.002
  clouds.rotation.y += 0.003
  atmosphere.rotation.y += 0.002

  planetUniforms.cloudRotationY.value = clouds.rotation.y - planet.rotation.y

  controls.update()
  postProcessing.render()

  if (__DEV__ && stats) stats.update()
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
