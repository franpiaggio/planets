import {
  PerspectiveCamera, Scene, Color, SphereGeometry, Mesh, WebGPURenderer
} from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createPlanetMaterial } from './shaders/planet'
import { setupGui } from './gui'

let camera: PerspectiveCamera
let scene: Scene
let renderer: WebGPURenderer
let controls: OrbitControls
let planet: Mesh

export async function init() {
  scene = new Scene()
  scene.background = new Color(0x000011)

  camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(0, 0, 4)

  renderer = new WebGPURenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  document.body.appendChild(renderer.domElement)
  await renderer.init()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 2
  controls.maxDistance = 10

  const geometry = new SphereGeometry(1, 64, 64)
  const { material, uniforms } = createPlanetMaterial()
  planet = new Mesh(geometry, material)
  scene.add(planet)

  setupGui(uniforms)

  window.addEventListener('resize', onResize)
  renderer.setAnimationLoop(animate)
}

function animate() {
  planet.rotation.y += 0.002
  controls.update()
  renderer.render(scene, camera)
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
