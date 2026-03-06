import {
  Mesh, SphereGeometry, PlaneGeometry,
  MeshBasicNodeMaterial, AdditiveBlending,
  TextureLoader, Group
} from 'three/webgpu'
import { texture, uniform, vec4, float, uv, mul } from 'three/tsl'

const loader = new TextureLoader()

export function createSunFlare(): Group {
  const group = new Group()

  // Bright sun core — small emissive sphere
  const coreMat = new MeshBasicNodeMaterial()
  coreMat.colorNode = vec4(1.0, 0.95, 0.8, 1.0)
  const core = new Mesh(new SphereGeometry(0.3, 16, 16), coreMat)
  group.add(core)

  // Glow billboard using lensflare texture
  const flareMap = loader.load('/textures/lensflare0.png')
  const glowMat = new MeshBasicNodeMaterial()
  glowMat.colorNode = mul(texture(flareMap, uv()), vec4(1.5, 1.3, 1.0, 1.0))
  glowMat.transparent = true
  glowMat.blending = AdditiveBlending
  glowMat.depthWrite = false
  glowMat.depthTest = false
  const glow = new Mesh(new PlaneGeometry(1, 1), glowMat)
  glow.scale.set(10, 10, 1)
  glow.renderOrder = 999
  glow.name = 'sunGlow'
  group.add(glow)

  return group
}
