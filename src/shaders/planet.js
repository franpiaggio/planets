import { Vector3, Color, MeshStandardNodeMaterial } from 'three/webgpu'
import {
  Fn, float, vec3, uniform,
  positionLocal, normalLocal, normalView,
  mix, smoothstep, abs, max, cross, normalize
} from 'three/tsl'
import { noise3D, fbm, ridgedFbm, erosionFbm, worley3D, worleyEdge3D } from '../lib/noise'
import { PALETTES } from '../palettes'

// Planet categories
export const CATEGORY_ROCKY = 1
export const CATEGORY_GAS = 2
export const CATEGORY_LIQUID = 3

// ---------------------------------------------------------------------------
// Planet material
// ---------------------------------------------------------------------------

function createBiomeUniforms(palette) {
  const b = palette.biome
  return {
    deepOcean:    uniform(new Color(b.deepOcean)),
    midOcean:     uniform(new Color(b.midOcean)),
    shallowWater: uniform(new Color(b.shallowWater)),
    coast:        uniform(new Color(b.coast)),
    sand:         uniform(new Color(b.sand)),
    sand2:        uniform(new Color(b.sand2)),
    savanna:      uniform(new Color(b.savanna)),
    savanna2:     uniform(new Color(b.savanna2)),
    grass:        uniform(new Color(b.grass)),
    grass2:       uniform(new Color(b.grass2)),
    forest:       uniform(new Color(b.forest)),
    forest2:      uniform(new Color(b.forest2)),
    rock:         uniform(new Color(b.rock)),
    rock2:        uniform(new Color(b.rock2)),
    snow:         uniform(new Color(b.snow)),
    snowDirty:    uniform(new Color(b.snowDirty)),
  }
}

export function createPlanetMaterial() {
  const defaultPalette = PALETTES[0]
  const biome = createBiomeUniforms(defaultPalette)

  const uniforms = {
    planetCategory: uniform(CATEGORY_ROCKY), // 1=rocky, 2=gas, 3=liquid
    noiseScale: uniform(2.2),
    lacunarity: uniform(2.7),      // higher = more visible multi-scale detail
    gain: uniform(0.45),
    terrainHeight: uniform(0.15),
    seaLevel: uniform(defaultPalette.seaLevel),
    warpStrength: uniform(0.55),
    ridgeStrength: uniform(0.12),  // how prominent ridged mountains are on land
    erosionStrength: uniform(0.0), // 0=smooth standard, 1=full erosion (flat valleys, rough peaks)
    sunDirection: uniform(new Vector3(1, 0.3, 0.5).normalize()),
    moistureScale: uniform(1.8),       // frequency of moisture noise field
    moistureOffset: uniform(new Vector3(42.3, 17.1, 88.7)), // offset so moisture is independent of terrain
    bumpStrength: uniform(0.6),       // procedural normal perturbation strength
    terrainPower: uniform(1.5),       // power redistribution: >1 = flatter valleys, sharper peaks
    worleyBlend: uniform(0.15),       // how much Worley pattern mixes into coloring
    seed: uniform(new Vector3(0, 0, 0)),
    ...biome,
  }

  const material = new MeshStandardNodeMaterial()

  // Domain warping — single layer
  const warpedPos = Fn(([pos]) => {
    const scaled = pos.add(uniforms.seed).mul(uniforms.noiseScale)

    const warp1x = noise3D(scaled.add(vec3(0.0, 4.7, 2.3))).sub(0.5)
    const warp1y = noise3D(scaled.add(vec3(1.3, 0.0, 6.7))).sub(0.5)
    const warp1z = noise3D(scaled.add(vec3(3.7, 8.1, 0.0))).sub(0.5)

    return scaled.add(vec3(warp1x, warp1y, warp1z).mul(uniforms.warpStrength))
  })

  // Multi-scale terrain elevation:
  //   1. Continental base (standard FBM) — defines land vs ocean
  //   2. Mountain ridges (ridged FBM) — sharp peaks, only on land
  //   3. Surface detail (single octave) — fine texture on highlands
  const getElevation = Fn(([pos]) => {
    const wp = warpedPos(pos)
    const sea = uniforms.seaLevel
    const lac = uniforms.lacunarity
    const g = uniforms.gain

    // Layer 1: Continental shapes — blend between smooth FBM and eroded FBM
    const smooth = fbm(wp, lac, g)
    const eroded = erosionFbm(wp, lac, g)
    const continent = mix(smooth, eroded, uniforms.erosionStrength)

    // Land mask — ridges only appear on land, fade in above sea level
    const landMask = smoothstep(sea, sea.add(0.06), continent)

    // Layer 2: Mountain ridges at 2x frequency, masked to land
    const ridges = ridgedFbm(wp.mul(2.0), lac, g)

    // Layer 3: Fine surface detail on highlands
    const highMask = smoothstep(sea.add(0.04), sea.add(0.12), continent)
    const detail = noise3D(pos.add(uniforms.seed).mul(uniforms.noiseScale.mul(4.0))).sub(0.5).mul(0.04)

    const raw = continent.add(ridges.mul(uniforms.ridgeStrength).mul(landMask)).add(detail.mul(highMask))
    // Power redistribution — flattens valleys, sharpens peaks
    return raw.pow(uniforms.terrainPower)
  })

  // Vertex displacement — only for rocky planets
  material.positionNode = Fn(() => {
    const pos = positionLocal
    const isRocky = smoothstep(1.0, 1.5, uniforms.planetCategory)
      .oneMinus() // 1 when rocky, 0 when gas/liquid

    const elevation = getElevation(pos)
    const seaLevel = uniforms.seaLevel
    const landHeight = smoothstep(seaLevel, seaLevel.add(0.01), elevation)
      .mul(elevation.sub(seaLevel))

    return pos.add(normalLocal.mul(landHeight.mul(uniforms.terrainHeight).mul(isRocky)))
  })()

  // Moisture field — independent noise for biome variation (single octave, cheap)
  const getMoisture = Fn(([pos]) => {
    const mp = pos.add(uniforms.seed).add(uniforms.moistureOffset).mul(uniforms.moistureScale)
    // 2 octaves inline — cheaper than full fbm
    const m1 = noise3D(mp)
    const m2 = noise3D(mp.mul(2.1)).mul(0.5)
    return m1.mul(0.67).add(m2.mul(0.33))
  })

  // --- Rocky biome coloring ---
  const getRockyColor = Fn(([pos]) => {
    const elevation = getElevation(pos)
    const sea = uniforms.seaLevel
    const wp = warpedPos(pos)

    // Color variation: blend Perlin + Worley for richer texture
    const cv = noise3D(wp.mul(3.0))
    const wv = worley3D(wp.mul(4.0))             // cellular texture (single call)
    const we = float(1.0).sub(wv)                // edge pattern derived from same call (free)
    const texVar = mix(cv, wv, uniforms.worleyBlend)
    const moisture = getMoisture(pos)

    // Perturbed biome boundaries
    const bn = noise3D(wp.mul(5.0)).sub(0.5).mul(0.008)

    // Ocean layers — add Worley for depth variation
    const col = vec3(uniforms.deepOcean).toVar()
    col.assign(mix(col, vec3(uniforms.midOcean),     smoothstep(sea.sub(0.15), sea.sub(0.06), elevation)))
    col.assign(mix(col, vec3(uniforms.shallowWater), smoothstep(sea.sub(0.06), sea.sub(0.02), elevation)))
    col.assign(mix(col, vec3(uniforms.coast),        smoothstep(sea.sub(0.02), sea, elevation)))

    // Land biomes — moisture blends variants, Worley adds texture
    const moist = smoothstep(0.35, 0.6, moisture)
    col.assign(mix(col, mix(vec3(uniforms.sand),    vec3(uniforms.sand2),    mix(texVar, moist, 0.35)), smoothstep(sea.add(bn), sea.add(float(0.01).add(bn)), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.savanna), vec3(uniforms.savanna2), mix(texVar, moist, 0.35)), smoothstep(sea.add(float(0.01).add(bn)), sea.add(float(0.035).add(bn)), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.grass),   vec3(uniforms.grass2),   mix(texVar, moist, 0.35)), smoothstep(sea.add(float(0.035).add(bn)), sea.add(float(0.06).add(bn)), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.forest),  vec3(uniforms.forest2),  mix(texVar, moist, 0.35)), smoothstep(sea.add(float(0.06).add(bn)),  sea.add(float(0.10).add(bn)), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.rock),    vec3(uniforms.rock2),    texVar), smoothstep(sea.add(float(0.10).add(bn)), sea.add(float(0.16).add(bn)), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.snow),    vec3(uniforms.snowDirty), texVar), smoothstep(sea.add(float(0.16).add(bn)), sea.add(float(0.22).add(bn)), elevation)))

    // Worley edge darkening on land — gives rocky/cracked texture
    const landMask = smoothstep(sea, sea.add(0.02), elevation)
    const edgeDarken = we.mul(0.12).mul(landMask).mul(uniforms.worleyBlend.mul(3.0))
    col.assign(col.mul(float(1.0).sub(edgeDarken)))

    return col
  })

  // --- Gas giant banded coloring ---
  // Low warp → clean horizontal bands (Saturn-like)
  // High warp → turbulent storms (Jupiter-like)
  const getGasColor = Fn(([pos]) => {
    const wp = warpedPos(pos)
    const lat = pos.y // latitude proxy [-1, 1]
    const warp = uniforms.warpStrength

    // Turbulence distortion scales with warp — calm planets keep clean bands
    const turb = noise3D(wp.mul(2.5)).sub(0.5).mul(warp.mul(0.3))
    const distortedLat = lat.add(turb)

    // Wide bands always present + fine sub-bands more visible at low warp
    const bandWide = noise3D(vec3(distortedLat.mul(6.0), float(0.0), float(0.0)))
    const bandFine = noise3D(vec3(distortedLat.mul(20.0), float(0.5), float(0.0)))
    const fineWeight = float(0.45).sub(warp.mul(0.15)).max(0.1) // 0.1–0.45: more fine detail at low warp
    const band = bandWide.mul(float(1.0).sub(fineWeight)).add(bandFine.mul(fineWeight))

    // Storm detail scales with warp — quiet at low warp, strong at high
    const storm = noise3D(wp.mul(5.0)).sub(0.5).mul(warp.mul(0.4))

    // 5-color band system
    const col = vec3(uniforms.deepOcean).toVar()
    col.assign(mix(col, vec3(uniforms.sand),    smoothstep(0.2, 0.35, band)))
    col.assign(mix(col, vec3(uniforms.savanna), smoothstep(0.35, 0.48, band)))
    col.assign(mix(col, vec3(uniforms.grass),   smoothstep(0.48, 0.58, band.add(storm.mul(0.5)))))
    col.assign(mix(col, vec3(uniforms.rock),    smoothstep(0.58, 0.7, band)))
    col.assign(mix(col, vec3(uniforms.forest),  smoothstep(0.7, 0.85, band.add(storm.mul(0.7)))))

    // Brightness variation — subtle at low warp, stronger at high
    const brightVar = storm.mul(0.3).add(0.95)
    col.assign(col.mul(brightVar))

    // Polar darkening
    const polarFade = smoothstep(0.8, 1.0, abs(lat))
    col.assign(mix(col, col.mul(0.55), polarFade))

    return col
  })

  // --- Liquid ocean world coloring ---
  const getLiquidColor = Fn(([pos]) => {
    const wp = warpedPos(pos)
    const depthNoise = noise3D(wp.mul(1.5))

    // Ocean depth variation
    const col = vec3(uniforms.deepOcean).toVar()
    col.assign(mix(col, vec3(uniforms.midOcean),     smoothstep(0.3, 0.5, depthNoise)))
    col.assign(mix(col, vec3(uniforms.shallowWater), smoothstep(0.55, 0.7, depthNoise)))

    // Subtle polar ice caps — only at extreme poles
    const lat = pos.y
    const iceMask = smoothstep(0.92, 0.98, abs(lat))
    const iceNoise = noise3D(wp.mul(3.0))
    col.assign(mix(col, vec3(uniforms.snow), iceMask.mul(smoothstep(0.45, 0.6, iceNoise)).mul(0.6)))

    return col
  })

  // --- Category-switched color ---
  material.colorNode = Fn(() => {
    const pos = positionLocal
    const cat = uniforms.planetCategory

    const rocky = getRockyColor(pos)
    const gas = getGasColor(pos)
    const liquid = getLiquidColor(pos)

    // Blend: cat=1 → rocky, cat=2 → gas, cat=3 → liquid
    const col = mix(rocky, gas, smoothstep(1.5, 2.0, cat)).toVar()
    col.assign(mix(col, liquid, smoothstep(2.5, 3.0, cat)))
    return col
  })()

  // Roughness per category — no elevation sampling to save performance
  material.roughnessNode = Fn(() => {
    const cat = uniforms.planetCategory
    // Rocky: 0.78 (decent middle ground), Gas: matte (0.85), Liquid: slightly glossy (0.7)
    const r = mix(float(0.78), float(0.85), smoothstep(1.5, 2.0, cat)).toVar()
    r.assign(mix(r, float(0.7), smoothstep(2.5, 3.0, cat)))
    return r
  })()

  material.metalnessNode = float(0.0)

  // Procedural normal perturbation — gives surface detail to lighting
  // Uses finite differences on a single noise layer (cheap: only 2 extra samples)
  const BUMP_EPS = 0.004
  material.normalNode = Fn(() => {
    const pos = positionLocal
    const cat = uniforms.planetCategory
    const isRocky = smoothstep(1.0, 1.5, cat).oneMinus()

    // Perlin-only bump — cheap, Worley texture comes from coloring
    const sp = pos.add(uniforms.seed).mul(uniforms.noiseScale.mul(2.5))
    const n0 = noise3D(sp)
    const nx = noise3D(sp.add(vec3(BUMP_EPS, 0, 0)))
    const nz = noise3D(sp.add(vec3(0, 0, BUMP_EPS)))

    const dx = nx.sub(n0).div(BUMP_EPS)
    const dz = nz.sub(n0).div(BUMP_EPS)

    // Perturb normal in view space
    const bumpScale = uniforms.bumpStrength.mul(uniforms.terrainHeight).mul(isRocky)
    const nv = normalView
    const t = normalize(cross(vec3(0.0, 1.0, 0.0), nv))
    const b = normalize(cross(nv, t))
    return normalize(nv.sub(t.mul(dx.mul(bumpScale))).sub(b.mul(dz.mul(bumpScale))))
  })()

  return { material, uniforms }
}
