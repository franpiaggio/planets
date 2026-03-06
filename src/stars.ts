import {
  Points, SphereGeometry, Float32BufferAttribute, PointsNodeMaterial
} from 'three/webgpu'
import { Fn, float, attribute } from 'three/tsl'

export function createStarfield(count = 3000, radius = 50) {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    // Random point on sphere surface
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = radius + (Math.random() - 0.5) * 10

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)

    // Vary sizes: most small, a few bright
    const r2 = Math.random()
    if (r2 > 0.995) sizes[i] = 7.0 + Math.random() * 4.0      // rare giant stars
    else if (r2 > 0.97) sizes[i] = 4.0 + Math.random() * 3.0  // bright
    else if (r2 > 0.85) sizes[i] = 1.8 + Math.random() * 2.2  // medium
    else if (r2 > 0.5) sizes[i] = 0.6 + Math.random() * 1.2   // small
    else sizes[i] = 0.15 + Math.random() * 0.45                // tiny/dim
  }

  const geometry = new SphereGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1))

  const material = new PointsNodeMaterial()
  material.colorNode = Fn(() => {
    // Slightly warm/cool variation
    const brightness = float(1.0).add(attribute('aSize').mul(0.1))
    return brightness
  })()
  material.sizeNode = attribute('aSize')

  const stars = new Points(geometry, material)
  return stars
}
