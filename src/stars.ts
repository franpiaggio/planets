import {
  Points, BufferGeometry, Float32BufferAttribute, PointsNodeMaterial
} from 'three/webgpu'
import { Fn, float, vec3, attribute } from 'three/tsl'

export function createStarfield(count = 12000, radius = 50) {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = radius + (Math.random() - 0.5) * 10

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)

    // Wide size distribution (screen pixels)
    const r2 = Math.random()
    let size: number
    if (r2 > 0.998) size = 7.0 + Math.random() * 4.0         // rare beacons
    else if (r2 > 0.993) size = 4.5 + Math.random() * 2.5    // bright
    else if (r2 > 0.97) size = 3.0 + Math.random() * 1.5     // notable
    else if (r2 > 0.85) size = 1.5 + Math.random() * 1.5     // medium
    else if (r2 > 0.5) size = 0.8 + Math.random() * 0.7      // small
    else size = 0.3 + Math.random() * 0.5                     // faint dust
    sizes[i] = size

    // Color temperature + HDR brightness to survive AgX tone mapping
    const ct = Math.random()
    let cr: number, cg: number, cb: number
    if (ct > 0.95) {
      // Blue-white hot
      cr = 2.0; cg = 2.3; cb = 3.5
    } else if (ct > 0.85) {
      // Warm yellow/orange
      cr = 3.0; cg = 2.0; cb = 1.2
    } else if (ct > 0.80) {
      // Reddish
      cr = 2.5; cg = 1.4; cb = 1.0
    } else {
      // White with subtle variation
      const w = 2.2 + Math.random() * 0.6
      cr = w; cg = w; cb = w
    }
    // Dimmer stars are much dimmer — wide brightness range
    const dimming = size < 1.0 ? 0.15 + size * 0.3 : 0.4 + Math.min(size / 5.0, 1.0) * 0.6
    colors[i * 3] = cr * dimming
    colors[i * 3 + 1] = cg * dimming
    colors[i * 3 + 2] = cb * dimming
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1))
  geometry.setAttribute('aColor', new Float32BufferAttribute(colors, 3))

  const material = new PointsNodeMaterial()
  material.colorNode = attribute('aColor')
  material.sizeNode = attribute('aSize')
  material.sizeAttenuation = false

  const stars = new Points(geometry, material)
  return stars
}
