import {
  Fn, float, vec2, vec3, vec4,
  fract, sin, dot, floor, mix, abs, cos,
  smoothstep, min, max
} from 'three/tsl'

// ============================================
// 3D Hash functions
// ============================================

const hash31 = Fn(([p]) => {
  const q = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  )
  return fract(sin(q).mul(43758.5453))
})

const hash3to1 = Fn(([p]) => {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))).mul(43758.5453))
})

// ============================================
// Value Noise 3D
// ============================================

const valueNoise3D = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)

  // Quintic interpolation (smoother than cubic)
  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0))

  // 8 corners of the cube
  const c000 = hash3to1(i)
  const c100 = hash3to1(i.add(vec3(1, 0, 0)))
  const c010 = hash3to1(i.add(vec3(0, 1, 0)))
  const c110 = hash3to1(i.add(vec3(1, 1, 0)))
  const c001 = hash3to1(i.add(vec3(0, 0, 1)))
  const c101 = hash3to1(i.add(vec3(1, 0, 1)))
  const c011 = hash3to1(i.add(vec3(0, 1, 1)))
  const c111 = hash3to1(i.add(vec3(1, 1, 1)))

  // Trilinear interpolation
  const x0 = mix(mix(c000, c100, u.x), mix(c010, c110, u.x), u.y)
  const x1 = mix(mix(c001, c101, u.x), mix(c011, c111, u.x), u.y)

  return mix(x0, x1, u.z)
})

// ============================================
// Gradient Noise 3D (Perlin-like)
// ============================================

const gradientNoise3D = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)

  // Quintic interpolation
  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0))

  // Gradient vectors from hash, then dot with distance
  const grad = Fn(([corner]) => {
    const g = hash31(corner).mul(2.0).sub(1.0)
    const d = f.sub(corner.sub(i))
    return dot(g, d)
  })

  const c000 = grad(i)
  const c100 = grad(i.add(vec3(1, 0, 0)))
  const c010 = grad(i.add(vec3(0, 1, 0)))
  const c110 = grad(i.add(vec3(1, 1, 0)))
  const c001 = grad(i.add(vec3(0, 0, 1)))
  const c101 = grad(i.add(vec3(1, 0, 1)))
  const c011 = grad(i.add(vec3(0, 1, 1)))
  const c111 = grad(i.add(vec3(1, 1, 1)))

  const x0 = mix(mix(c000, c100, u.x), mix(c010, c110, u.x), u.y)
  const x1 = mix(mix(c001, c101, u.x), mix(c011, c111, u.x), u.y)

  // Remap from [-1,1] to [0,1]
  return mix(x0, x1, u.z).mul(0.5).add(0.5)
})

// ============================================
// Voronoi / Worley Noise 3D
// ============================================

const voronoiNoise3D = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)

  const minDist = float(1.0).toVar()

  // Check 3x3x3 neighborhood
  // Unrolled because TSL loops with nested 3D are complex
  const checkCell = Fn(([offset]) => {
    const neighbor = i.add(offset)
    const point = hash31(neighbor)
    const diff = offset.add(point).sub(f)
    const dist = dot(diff, diff)
    minDist.assign(min(minDist, dist))
  })

  // 27 cells (3x3x3)
  checkCell(vec3(-1, -1, -1)); checkCell(vec3(0, -1, -1)); checkCell(vec3(1, -1, -1))
  checkCell(vec3(-1,  0, -1)); checkCell(vec3(0,  0, -1)); checkCell(vec3(1,  0, -1))
  checkCell(vec3(-1,  1, -1)); checkCell(vec3(0,  1, -1)); checkCell(vec3(1,  1, -1))

  checkCell(vec3(-1, -1,  0)); checkCell(vec3(0, -1,  0)); checkCell(vec3(1, -1,  0))
  checkCell(vec3(-1,  0,  0)); checkCell(vec3(0,  0,  0)); checkCell(vec3(1,  0,  0))
  checkCell(vec3(-1,  1,  0)); checkCell(vec3(0,  1,  0)); checkCell(vec3(1,  1,  0))

  checkCell(vec3(-1, -1,  1)); checkCell(vec3(0, -1,  1)); checkCell(vec3(1, -1,  1))
  checkCell(vec3(-1,  0,  1)); checkCell(vec3(0,  0,  1)); checkCell(vec3(1,  0,  1))
  checkCell(vec3(-1,  1,  1)); checkCell(vec3(0,  1,  1)); checkCell(vec3(1,  1,  1))

  return minDist.pow(0.5)
})

// ============================================
// Ridged noise (absolute value creates ridges)
// ============================================

const ridgedNoise3D = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)
  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0))

  const grad = Fn(([corner]) => {
    const g = hash31(corner).mul(2.0).sub(1.0)
    const d = f.sub(corner.sub(i))
    return dot(g, d)
  })

  const c000 = grad(i)
  const c100 = grad(i.add(vec3(1, 0, 0)))
  const c010 = grad(i.add(vec3(0, 1, 0)))
  const c110 = grad(i.add(vec3(1, 1, 0)))
  const c001 = grad(i.add(vec3(0, 0, 1)))
  const c101 = grad(i.add(vec3(1, 0, 1)))
  const c011 = grad(i.add(vec3(0, 1, 1)))
  const c111 = grad(i.add(vec3(1, 1, 1)))

  const x0 = mix(mix(c000, c100, u.x), mix(c010, c110, u.x), u.y)
  const x1 = mix(mix(c001, c101, u.x), mix(c011, c111, u.x), u.y)

  const n = mix(x0, x1, u.z)
  // Ridged: 1.0 - abs(noise), then squared for sharpness
  const ridged = float(1.0).sub(abs(n))
  return ridged.mul(ridged)
})

// ============================================
// Simplex-like Noise 3D
// Gradient noise with rotated domain to break
// grid alignment — gives results similar to
// simplex without the complex tetrahedron math
// ============================================

const simplexNoise3D = Fn(([p]) => {
  // Rotate input domain to break axis-aligned artifacts
  // This rotation matrix eliminates the square grid pattern
  const rp = vec3(
    dot(p, vec3(0.5, -0.866025, 0.0)),
    dot(p, vec3(0.866025, 0.5, 0.0)),
    p.z.add(p.x.mul(0.3)).add(p.y.mul(0.3))
  )

  const i = floor(rp)
  const f = fract(rp)

  // Quintic interpolation
  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0))

  // Use different hash seeds than gradient noise for variety
  const hash = Fn(([corner]) => {
    const q = vec3(
      dot(corner, vec3(37.1, 157.7, 97.7)),
      dot(corner, vec3(191.5, 67.3, 213.1)),
      dot(corner, vec3(59.5, 201.9, 71.6))
    )
    return fract(sin(q).mul(43758.5453)).mul(2.0).sub(1.0)
  })

  const grad = Fn(([corner]) => {
    const g = hash(corner)
    const d = f.sub(corner.sub(i))
    return dot(g, d)
  })

  const c000 = grad(i)
  const c100 = grad(i.add(vec3(1, 0, 0)))
  const c010 = grad(i.add(vec3(0, 1, 0)))
  const c110 = grad(i.add(vec3(1, 1, 0)))
  const c001 = grad(i.add(vec3(0, 0, 1)))
  const c101 = grad(i.add(vec3(1, 0, 1)))
  const c011 = grad(i.add(vec3(0, 1, 1)))
  const c111 = grad(i.add(vec3(1, 1, 1)))

  const x0 = mix(mix(c000, c100, u.x), mix(c010, c110, u.x), u.y)
  const x1 = mix(mix(c001, c101, u.x), mix(c011, c111, u.x), u.y)

  return mix(x0, x1, u.z).mul(0.5).add(0.5)
})

// ============================================
// Noise lookup by type index
// ============================================

// Single-type exports for cheap detail layers (1/5 cost of sampleNoise)
export { gradientNoise3D, voronoiNoise3D, ridgedNoise3D }

// Type 1 = Gradient (Perlin), 2 = Simplex
export const sampleNoise = Fn(([p, noiseType]) => {
  const g = gradientNoise3D(p)
  const s = simplexNoise3D(p)
  return mix(g, s, smoothstep(1.5, 2.5, noiseType))
})

// ============================================
// FBM with selectable noise type
// ============================================

export const fbm = Fn(([p, noiseType, octaves, lacunarity, gain]) => {
  const value = float(0.0).toVar()
  const amplitude = float(0.5).toVar()
  const pos = p.toVar()

  // Octave 1
  value.addAssign(sampleNoise(pos, noiseType).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 2
  value.addAssign(sampleNoise(pos, noiseType).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 3
  value.addAssign(sampleNoise(pos, noiseType).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 4
  value.addAssign(sampleNoise(pos, noiseType).mul(amplitude))

  return value
})
