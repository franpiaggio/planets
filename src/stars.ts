import {
  Points, BufferGeometry, Float32BufferAttribute, PointsNodeMaterial
} from 'three/webgpu'
import { attribute } from 'three/tsl'

export function createStarfield(count = 14000, radius = 50) {
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

    // Size distribution — more stars in the visible range
    const r2 = Math.random()
    let size: number
    if (r2 > 0.998) size = 7.0 + Math.random() * 4.0          // rare beacons
    else if (r2 > 0.992) size = 4.5 + Math.random() * 2.5     // bright
    else if (r2 > 0.96) size = 3.0 + Math.random() * 1.5      // notable
    else if (r2 > 0.80) size = 1.8 + Math.random() * 1.2      // medium
    else if (r2 > 0.40) size = 1.0 + Math.random() * 0.8      // small but visible
    else size = 0.5 + Math.random() * 0.5                      // faint
    sizes[i] = size

    // Color temperature — realistic stellar classes
    const ct = Math.random()
    let cr: number, cg: number, cb: number
    if (ct > 0.96) {
      // O/B class — blue-white hot
      cr = 1.8; cg = 2.1; cb = 3.2
    } else if (ct > 0.90) {
      // A class — blue-white
      cr = 2.2; cg = 2.3; cb = 2.8
    } else if (ct > 0.82) {
      // F class — white with warm tint
      cr = 2.5; cg = 2.4; cb = 2.2
    } else if (ct > 0.70) {
      // G class — yellow (sun-like)
      cr = 2.8; cg = 2.4; cb = 1.6
    } else if (ct > 0.55) {
      // K class — orange
      cr = 2.8; cg = 1.8; cb = 1.2
    } else if (ct > 0.45) {
      // M class — red
      cr = 2.4; cg = 1.3; cb = 0.9
    } else {
      // Generic white with subtle random tint
      const w = 2.2 + Math.random() * 0.4
      const tint = Math.random() * 0.3
      cr = w + tint * (Math.random() - 0.5)
      cg = w + tint * (Math.random() - 0.5)
      cb = w + tint * (Math.random() - 0.5)
    }

    // Brightness curve — keep faint stars more visible
    let brightness: number
    if (size >= 4.5) brightness = 0.9 + Math.random() * 0.1
    else if (size >= 3.0) brightness = 0.7 + Math.random() * 0.2
    else if (size >= 1.8) brightness = 0.5 + Math.random() * 0.2
    else if (size >= 1.0) brightness = 0.35 + Math.random() * 0.15
    else brightness = 0.2 + Math.random() * 0.15

    colors[i * 3] = cr * brightness
    colors[i * 3 + 1] = cg * brightness
    colors[i * 3 + 2] = cb * brightness
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
