import {
  Fn, float, vec3,
  abs, mix, clamp, smoothstep,
  mx_noise_float, mx_worley_noise_float
} from 'three/tsl'

// ---------------------------------------------------------------------------
// Base noise: MaterialX Perlin 3D (via mx_noise_float)
// mx_noise_float(pos, amplitude, pivot) = perlin(pos) * amplitude + pivot
// With defaults: returns ~[-1, 1]
// noise3D remaps to [0, 1]
// ---------------------------------------------------------------------------

const perlin3D = (p) => mx_noise_float(p, 1, 0)

export const noise3D = Fn(([p]) => {
  return perlin3D(p).mul(0.5).add(0.5)
})

// Keep this alias for backward compatibility with clouds.js, atmosphere.js, rings.js
export const gradientNoise3D = noise3D

// ---------------------------------------------------------------------------
// Worley (Voronoi) noise — cellular patterns
// mx_worley_noise_float(pos, jitter, metric)
// jitter: cell randomness (0=grid, 1=full), metric: 0=Euclidean
// Returns distance to nearest cell center ~[0, 1]
// ---------------------------------------------------------------------------

export const worley3D = Fn(([p]) => {
  return mx_worley_noise_float(p, 1.0, 0)
})

// Inverted Worley — bright at cell edges, dark at centers
// Good for cracks, veins, terrain texture
export const worleyEdge3D = Fn(([p]) => {
  return float(1.0).sub(mx_worley_noise_float(p, 1.0, 0))
})

// ---------------------------------------------------------------------------
// Standard FBM — 6 octaves, unrolled
// Returns ~[0, 1]
// ---------------------------------------------------------------------------

export const fbm = Fn(([p, lacunarity, gain]) => {
  const value = float(0.0).toVar()
  const amplitude = float(0.5).toVar()
  const pos = p.toVar()

  // Octave 1
  value.addAssign(noise3D(pos).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)
  // Octave 2
  value.addAssign(noise3D(pos).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)
  // Octave 3
  value.addAssign(noise3D(pos).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)
  // Octave 4
  value.addAssign(noise3D(pos).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)
  // Octave 5
  value.addAssign(noise3D(pos).mul(amplitude))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)
  // Octave 6
  value.addAssign(noise3D(pos).mul(amplitude))

  return value
})

// ---------------------------------------------------------------------------
// Ridged Multifractal FBM — 6 octaves, unrolled
// Sharp ridges, detail concentrates on peaks (heterogeneous)
// Returns ~[0, 1]
// ---------------------------------------------------------------------------

export const ridgedFbm = Fn(([p, lacunarity, gain]) => {
  const value = float(0.0).toVar()
  const amplitude = float(0.5).toVar()
  const weight = float(1.0).toVar()
  const pos = p.toVar()

  // Each octave: signal = (1 - |perlin|)^2 * weight
  // perlin is in [-1,1], so |perlin| is [0,1], and 1-|perlin| peaks at zero crossings
  // weight = clamp(signal * gain) — detail concentrates near ridges

  // Octave 1
  const s1 = float(1.0).sub(abs(perlin3D(pos))).toVar()
  s1.assign(s1.mul(s1))
  value.addAssign(s1.mul(amplitude))
  weight.assign(clamp(s1.mul(gain), 0.0, 1.0))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 2
  const s2 = float(1.0).sub(abs(perlin3D(pos))).toVar()
  s2.assign(s2.mul(s2).mul(weight))
  value.addAssign(s2.mul(amplitude))
  weight.assign(clamp(s2.mul(gain), 0.0, 1.0))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 3
  const s3 = float(1.0).sub(abs(perlin3D(pos))).toVar()
  s3.assign(s3.mul(s3).mul(weight))
  value.addAssign(s3.mul(amplitude))
  weight.assign(clamp(s3.mul(gain), 0.0, 1.0))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 4
  const s4 = float(1.0).sub(abs(perlin3D(pos))).toVar()
  s4.assign(s4.mul(s4).mul(weight))
  value.addAssign(s4.mul(amplitude))
  weight.assign(clamp(s4.mul(gain), 0.0, 1.0))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 5
  const s5 = float(1.0).sub(abs(perlin3D(pos))).toVar()
  s5.assign(s5.mul(s5).mul(weight))
  value.addAssign(s5.mul(amplitude))
  weight.assign(clamp(s5.mul(gain), 0.0, 1.0))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 6
  const s6 = float(1.0).sub(abs(perlin3D(pos))).toVar()
  s6.assign(s6.mul(s6).mul(weight))
  value.addAssign(s6.mul(amplitude))

  return value
})

// ---------------------------------------------------------------------------
// Erosion FBM (IQ-inspired) — 4 octaves, unrolled
// Uses central differences for derivative-based amplitude suppression.
// Flat valleys + rough peaks = natural erosion look.
// 4 octaves is enough — erosion effect is most visible at low/mid frequencies.
// Returns ~[0, 1]
// ---------------------------------------------------------------------------

const DERIV_EPS = 0.01

export const erosionFbm = Fn(([p, lacunarity, gain]) => {
  const value = float(0.0).toVar()
  const amplitude = float(0.5).toVar()
  const derivX = float(0.0).toVar()
  const derivY = float(0.0).toVar()
  const pos = p.toVar()

  // Octave 1
  const n1 = perlin3D(pos).toVar()
  const dx1 = perlin3D(pos.add(vec3(DERIV_EPS, 0, 0))).sub(n1).div(DERIV_EPS)
  const dy1 = perlin3D(pos.add(vec3(0, DERIV_EPS, 0))).sub(n1).div(DERIV_EPS)
  derivX.addAssign(dx1.mul(amplitude))
  derivY.addAssign(dy1.mul(amplitude))
  value.addAssign(amplitude.mul(n1).div(float(1.0).add(derivX.mul(derivX).add(derivY.mul(derivY)))))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 2
  const n2 = perlin3D(pos).toVar()
  const dx2 = perlin3D(pos.add(vec3(DERIV_EPS, 0, 0))).sub(n2).div(DERIV_EPS)
  const dy2 = perlin3D(pos.add(vec3(0, DERIV_EPS, 0))).sub(n2).div(DERIV_EPS)
  derivX.addAssign(dx2.mul(amplitude))
  derivY.addAssign(dy2.mul(amplitude))
  value.addAssign(amplitude.mul(n2).div(float(1.0).add(derivX.mul(derivX).add(derivY.mul(derivY)))))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 3
  const n3 = perlin3D(pos).toVar()
  const dx3 = perlin3D(pos.add(vec3(DERIV_EPS, 0, 0))).sub(n3).div(DERIV_EPS)
  const dy3 = perlin3D(pos.add(vec3(0, DERIV_EPS, 0))).sub(n3).div(DERIV_EPS)
  derivX.addAssign(dx3.mul(amplitude))
  derivY.addAssign(dy3.mul(amplitude))
  value.addAssign(amplitude.mul(n3).div(float(1.0).add(derivX.mul(derivX).add(derivY.mul(derivY)))))
  pos.mulAssign(lacunarity)
  amplitude.mulAssign(gain)

  // Octave 4
  const n4 = perlin3D(pos).toVar()
  const dx4 = perlin3D(pos.add(vec3(DERIV_EPS, 0, 0))).sub(n4).div(DERIV_EPS)
  const dy4 = perlin3D(pos.add(vec3(0, DERIV_EPS, 0))).sub(n4).div(DERIV_EPS)
  derivX.addAssign(dx4.mul(amplitude))
  derivY.addAssign(dy4.mul(amplitude))
  value.addAssign(amplitude.mul(n4).div(float(1.0).add(derivX.mul(derivX).add(derivY.mul(derivY)))))

  // Remap from ~[-0.5, 0.5] to [0, 1]
  return value.mul(0.5).add(0.5)
})

