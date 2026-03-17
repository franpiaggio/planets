import { Vector3, Color, MeshStandardNodeMaterial } from 'three/webgpu'
import {
  Fn, float, vec3, uniform,
  positionLocal, normalLocal,
  mix, smoothstep, abs
} from 'three/tsl'
import { noise3D, fbm, ridgedFbm, erosionFbm, worley3D } from '../lib/noise'
import { PALETTES } from '../palettes'

// Planet categories
export const CATEGORY_ROCKY = 1
export const CATEGORY_GAS = 2
export const CATEGORY_LIQUID = 3

// ---------------------------------------------------------------------------
// Shared uniforms — created once, used by all 3 materials
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

function createSharedUniforms() {
  const defaultPalette = PALETTES[0]
  const biome = createBiomeUniforms(defaultPalette)

  return {
    planetCategory: uniform(CATEGORY_ROCKY),
    noiseScale: uniform(2.2),
    lacunarity: uniform(2.7),
    gain: uniform(0.45),
    terrainHeight: uniform(0.15),
    seaLevel: uniform(defaultPalette.seaLevel),
    warpStrength: uniform(0.55),
    ridgeStrength: uniform(0.12),
    erosionStrength: uniform(0.0),
    sunDirection: uniform(new Vector3(1, 0.3, 0.5).normalize()),
    moistureScale: uniform(1.8),
    moistureOffset: uniform(new Vector3(42.3, 17.1, 88.7)),
    bumpStrength: uniform(0.6),
    terrainPower: uniform(1.5),
    worleyBlend: uniform(0.15),
    seed: uniform(new Vector3(0, 0, 0)),
    ...biome,
  }
}

// ---------------------------------------------------------------------------
// Shared noise helpers (reference same uniforms)
// ---------------------------------------------------------------------------

function createWarpedPos(uniforms) {
  return Fn(([pos]) => {
    const scaled = pos.add(uniforms.seed).mul(uniforms.noiseScale)
    const warp1x = noise3D(scaled.add(vec3(0.0, 4.7, 2.3))).sub(0.5)
    const warp1y = noise3D(scaled.add(vec3(1.3, 0.0, 6.7))).sub(0.5)
    const warp1z = noise3D(scaled.add(vec3(3.7, 8.1, 0.0))).sub(0.5)
    return scaled.add(vec3(warp1x, warp1y, warp1z).mul(uniforms.warpStrength))
  })
}

// ---------------------------------------------------------------------------
// Rocky material
// ~30 noise samples in color, ~25 in position, 3 in normal
// ---------------------------------------------------------------------------

function createRockyMaterial(uniforms) {
  const material = new MeshStandardNodeMaterial()
  const warpedPos = createWarpedPos(uniforms)

  const getElevation = Fn(([pos]) => {
    const wp = warpedPos(pos)
    const sea = uniforms.seaLevel
    const lac = uniforms.lacunarity
    const g = uniforms.gain

    const smooth = fbm(wp, lac, g)
    const eroded = erosionFbm(wp, lac, g)
    const continent = mix(smooth, eroded, uniforms.erosionStrength)

    const landMask = smoothstep(sea, sea.add(0.06), continent)
    const ridges = ridgedFbm(wp.mul(2.0), lac, g)

    const highMask = smoothstep(sea.add(0.04), sea.add(0.12), continent)
    const detail = noise3D(pos.add(uniforms.seed).mul(uniforms.noiseScale.mul(4.0))).sub(0.5).mul(0.04)

    const raw = continent.add(ridges.mul(uniforms.ridgeStrength).mul(landMask)).add(detail.mul(highMask))
    return raw.pow(uniforms.terrainPower)
  })

  // Vertex displacement
  material.positionNode = Fn(() => {
    const pos = positionLocal
    const elevation = getElevation(pos)
    const seaLevel = uniforms.seaLevel
    const landHeight = smoothstep(seaLevel, seaLevel.add(0.01), elevation)
      .mul(elevation.sub(seaLevel))
    return pos.add(normalLocal.mul(landHeight.mul(uniforms.terrainHeight)))
  })()

  // Moisture
  const getMoisture = Fn(([pos]) => {
    const mp = pos.add(uniforms.seed).add(uniforms.moistureOffset).mul(uniforms.moistureScale)
    const m1 = noise3D(mp)
    const m2 = noise3D(mp.mul(2.1)).mul(0.5)
    return m1.mul(0.67).add(m2.mul(0.33))
  })

  // Color
  material.colorNode = Fn(() => {
    const pos = positionLocal
    const elevation = getElevation(pos)
    const sea = uniforms.seaLevel
    const wp = warpedPos(pos)

    const cv = noise3D(wp.mul(3.0))
    const wv = worley3D(wp.mul(4.0))
    const we = float(1.0).sub(wv)
    const texVar = mix(cv, wv, uniforms.worleyBlend)
    const moisture = getMoisture(pos)

    const bn = noise3D(wp.mul(5.0)).sub(0.5).mul(0.008)

    // Remap elevation: when sea is low (no ocean), use elevation directly as 0-1 for biome mapping
    // When sea is normal, use sea-relative offsets as before
    const noOceanBlend = smoothstep(0.2, 0.0, sea) // 1 when no ocean, 0 when sea >= 0.2

    // Ocean-relative elevation (original system)
    const eOcean = elevation
    // Absolute elevation normalized to ~[0,1] (for no-ocean planets)
    const eAbs = elevation.mul(1.2) // scale so biomes fill the range

    // Pick which elevation mapping to use
    const e = mix(eOcean, eAbs, noOceanBlend)
    // Sea threshold: for no-ocean, use 0 so all land biomes start from bottom
    const s = mix(sea, float(0.0), noOceanBlend)

    const col = vec3(uniforms.deepOcean).toVar()
    col.assign(mix(col, vec3(uniforms.midOcean),     smoothstep(s.sub(0.15), s.sub(0.06), e)))
    col.assign(mix(col, vec3(uniforms.shallowWater), smoothstep(s.sub(0.06), s.sub(0.02), e)))
    col.assign(mix(col, vec3(uniforms.coast),        smoothstep(s.sub(0.02), s, e)))

    const moist = smoothstep(0.35, 0.6, moisture)
    col.assign(mix(col, mix(vec3(uniforms.sand),    vec3(uniforms.sand2),    mix(texVar, moist, 0.35)), smoothstep(s.add(bn), s.add(float(0.04).add(bn)), e)))
    col.assign(mix(col, mix(vec3(uniforms.savanna), vec3(uniforms.savanna2), mix(texVar, moist, 0.35)), smoothstep(s.add(float(0.04).add(bn)), s.add(float(0.12).add(bn)), e)))
    col.assign(mix(col, mix(vec3(uniforms.grass),   vec3(uniforms.grass2),   mix(texVar, moist, 0.35)), smoothstep(s.add(float(0.12).add(bn)), s.add(float(0.22).add(bn)), e)))
    col.assign(mix(col, mix(vec3(uniforms.forest),  vec3(uniforms.forest2),  mix(texVar, moist, 0.35)), smoothstep(s.add(float(0.22).add(bn)), s.add(float(0.35).add(bn)), e)))
    col.assign(mix(col, mix(vec3(uniforms.rock),    vec3(uniforms.rock2),    texVar), smoothstep(s.add(float(0.35).add(bn)), s.add(float(0.50).add(bn)), e)))
    col.assign(mix(col, mix(vec3(uniforms.snow),    vec3(uniforms.snowDirty), texVar), smoothstep(s.add(float(0.50).add(bn)), s.add(float(0.65).add(bn)), e)))

    const landMask = smoothstep(sea, sea.add(0.02), elevation)
    const edgeDarken = we.mul(0.12).mul(landMask).mul(uniforms.worleyBlend.mul(3.0))
    col.assign(col.mul(float(1.0).sub(edgeDarken)))

    return col
  })()

  material.roughnessNode = float(0.78)
  material.metalnessNode = float(0.0)

  return material
}

// ---------------------------------------------------------------------------
// Gas material
// ~7 noise samples in color (warp + bands + storm), no displacement, no bump
// ---------------------------------------------------------------------------

function createGasMaterial(uniforms) {
  const material = new MeshStandardNodeMaterial()
  const warpedPos = createWarpedPos(uniforms)

  // No vertex displacement

  material.colorNode = Fn(() => {
    const pos = positionLocal
    const wp = warpedPos(pos)
    const lat = pos.y
    const warp = uniforms.warpStrength

    const turb = noise3D(wp.mul(2.5)).sub(0.5).mul(warp.mul(0.3))
    const distortedLat = lat.add(turb)

    const bandWide = noise3D(vec3(distortedLat.mul(6.0), float(0.0), float(0.0)))
    const bandFine = noise3D(vec3(distortedLat.mul(20.0), float(0.5), float(0.0)))
    const fineWeight = float(0.45).sub(warp.mul(0.15)).max(0.1)
    const band = bandWide.mul(float(1.0).sub(fineWeight)).add(bandFine.mul(fineWeight))

    const storm = noise3D(wp.mul(5.0)).sub(0.5).mul(warp.mul(0.4))

    const col = vec3(uniforms.deepOcean).toVar()
    col.assign(mix(col, vec3(uniforms.sand),    smoothstep(0.2, 0.35, band)))
    col.assign(mix(col, vec3(uniforms.savanna), smoothstep(0.35, 0.48, band)))
    col.assign(mix(col, vec3(uniforms.grass),   smoothstep(0.48, 0.58, band.add(storm.mul(0.5)))))
    col.assign(mix(col, vec3(uniforms.rock),    smoothstep(0.58, 0.7, band)))
    col.assign(mix(col, vec3(uniforms.forest),  smoothstep(0.7, 0.85, band.add(storm.mul(0.7)))))

    const brightVar = storm.mul(0.3).add(0.95)
    col.assign(col.mul(brightVar))

    const polarFade = smoothstep(0.8, 1.0, abs(lat))
    col.assign(mix(col, col.mul(0.55), polarFade))

    return col
  })()

  material.roughnessNode = float(0.85)
  material.metalnessNode = float(0.0)

  // No normal perturbation — gas is smooth

  return material
}

// ---------------------------------------------------------------------------
// Liquid material
// ~15 noise samples in color (warp + 2 FBM), no displacement, subtle bump
// ---------------------------------------------------------------------------

function createLiquidMaterial(uniforms) {
  const material = new MeshStandardNodeMaterial()
  const warpedPos = createWarpedPos(uniforms)

  material.colorNode = Fn(() => {
    const pos = positionLocal
    const wp = warpedPos(pos)
    const lac = uniforms.lacunarity
    const g = uniforms.gain
    const lat = pos.y

    // IQ double-warp FBM for organic flow patterns
    const depth = fbm(wp, lac, g)
    const currentWarp = fbm(wp.add(vec3(5.2, 1.3, 2.8)), lac, g)
    const finalDepth = depth.add(currentWarp.sub(0.5).mul(0.25))

    // Worley for cellular current patterns
    const cellPattern = worley3D(wp.mul(3.0))
    const cellEdge = float(1.0).sub(cellPattern)

    // Fine detail noise for surface texture
    const detail = noise3D(pos.add(uniforms.seed).mul(uniforms.noiseScale.mul(6.0))).sub(0.5).mul(0.06)

    // Color bands — more gradual transitions with detail variation
    const e = finalDepth.add(detail)
    const col = vec3(uniforms.deepOcean).toVar()
    col.assign(mix(col, vec3(uniforms.midOcean),     smoothstep(0.30, 0.40, e)))
    col.assign(mix(col, vec3(uniforms.shallowWater), smoothstep(0.42, 0.52, e)))
    col.assign(mix(col, vec3(uniforms.coast),        smoothstep(0.55, 0.65, e)))
    col.assign(mix(col, vec3(uniforms.sand),         smoothstep(0.68, 0.78, e)))

    // Worley cell edges darken slightly — current boundaries
    const edgeDarken = cellEdge.mul(0.08).mul(uniforms.worleyBlend.mul(2.0))
    col.assign(col.mul(float(1.0).sub(edgeDarken)))

    // Subtle brightness variation from currents
    const currentVar = currentWarp.sub(0.5).mul(0.1)
    col.assign(col.mul(float(1.0).add(currentVar)))

    // Polar ice caps
    const iceMask = smoothstep(0.88, 0.96, abs(lat))
    const iceNoise = fbm(wp.mul(1.5), lac, g)
    col.assign(mix(col, vec3(uniforms.snow), iceMask.mul(smoothstep(0.4, 0.6, iceNoise)).mul(0.7)))

    return col
  })()

  // Higher roughness = less specular, more matte ocean look
  material.roughnessNode = float(0.78)
  material.metalnessNode = float(0.0)

  return material
}

// ---------------------------------------------------------------------------
// Public API — creates uniforms + 3 materials, returns swap helper
// ---------------------------------------------------------------------------

export function createPlanetMaterial() {
  const uniforms = createSharedUniforms()

  /** @type {Record<number, import('three/webgpu').MeshStandardNodeMaterial>} */
  const materials = {
    [CATEGORY_ROCKY]:  createRockyMaterial(uniforms),
    [CATEGORY_GAS]:    createGasMaterial(uniforms),
    [CATEGORY_LIQUID]: createLiquidMaterial(uniforms),
  }

  return {
    material: materials[CATEGORY_ROCKY], // default
    materials,
    uniforms,
  }
}
