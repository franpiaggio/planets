import { Mesh, PlaneGeometry, MeshBasicNodeMaterial, AdditiveBlending, DoubleSide } from 'three/webgpu'
import { Fn, uv, float, vec3, vec4, smoothstep, pow, length, sub } from 'three/tsl'

export function createSunFlare(): Mesh {
  const mat = new MeshBasicNodeMaterial()

  mat.colorNode = Fn(() => {
    const center = sub(uv(), vec3(0.5, 0.5, 0))
    const dist = length(center.xy)

    // Keep all values under bloom threshold so bloom doesn't square it
    const core = pow(smoothstep(float(0.06), float(0.0), dist), float(1.5)).mul(0.95)
    const midGlow = pow(smoothstep(float(0.2), float(0.0), dist), float(2.5)).mul(0.5)
    const outerGlow = pow(smoothstep(float(0.4), float(0.05), dist), float(4.0)).mul(0.15)

    const coreColor = vec3(1.0, 0.97, 0.9)
    const glowColor = vec3(1.0, 0.88, 0.65)
    const haloColor = vec3(1.0, 0.8, 0.5)

    const color = coreColor.mul(core)
      .add(glowColor.mul(midGlow))
      .add(haloColor.mul(outerGlow))

    // Fade to zero well before quad edge
    const edgeMask = smoothstep(float(0.45), float(0.2), dist)
    const alpha = core.add(midGlow).add(outerGlow).mul(edgeMask)

    return vec4(color.mul(edgeMask), alpha)
  })()

  mat.transparent = true
  mat.blending = AdditiveBlending
  mat.depthWrite = false
  mat.depthTest = true
  mat.side = DoubleSide

  const mesh = new Mesh(new PlaneGeometry(1, 1), mat)
  mesh.scale.set(8, 8, 1)
  mesh.renderOrder = 999

  return mesh
}
