import {
  Fn, float, vec3,
  fract, sin, dot, floor, mix, abs,
  smoothstep
} from 'three/tsl'

// ---------------------------------------------------------------------------
// Hash (pseudo-random from 3D position)
// ---------------------------------------------------------------------------

const hash31 = Fn(([p]) => {
  const q = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  )
  return fract(sin(q).mul(43758.5453))
})

// ---------------------------------------------------------------------------
// Gradient Noise 3D (Perlin-like)
// ---------------------------------------------------------------------------

export const gradientNoise3D = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)

  // Quintic interpolation
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

  // Remap from [-1,1] to [0,1]
  return mix(x0, x1, u.z).mul(0.5).add(0.5)
})

// ---------------------------------------------------------------------------
// Simplex-like Noise 3D
// Rotated-domain gradient noise that breaks grid alignment
// ---------------------------------------------------------------------------

const simplexNoise3D = Fn(([p]) => {
  // Rotate input domain to break axis-aligned artifacts
  const rp = vec3(
    dot(p, vec3(0.5, -0.866025, 0.0)),
    dot(p, vec3(0.866025, 0.5, 0.0)),
    p.z.add(p.x.mul(0.3)).add(p.y.mul(0.3))
  )

  const i = floor(rp)
  const f = fract(rp)

  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6.0).sub(15.0)).add(10.0))

  // Different hash seeds than gradient noise for variety
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

// ---------------------------------------------------------------------------
// Noise selector: 1 = Perlin, 2 = Simplex
// ---------------------------------------------------------------------------

export const sampleNoise = Fn(([p, noiseType]) => {
  const g = gradientNoise3D(p)
  const s = simplexNoise3D(p)
  return mix(g, s, smoothstep(1.5, 2.5, noiseType))
})

// ---------------------------------------------------------------------------
// FBM (4 octaves, unrolled)
// ---------------------------------------------------------------------------

export const fbm = Fn(([p, noiseType, octaves, lacunarity, gain]) => {
  const value = float(0.0).toVar()
  const amplitude = float(0.5).toVar()
  const pos = p.toVar()

  value.addAssign(sampleNoise(pos, noiseType).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  value.addAssign(sampleNoise(pos, noiseType).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  value.addAssign(sampleNoise(pos, noiseType).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  value.addAssign(sampleNoise(pos, noiseType).mul(amplitude))

  return value
})
