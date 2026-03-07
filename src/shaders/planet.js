import { Vector3, Color, MeshStandardNodeMaterial } from 'three/webgpu'
import {
  Fn, float, vec3, uniform,
  positionLocal, normalLocal,
  mix, smoothstep, cos, sin, abs
} from 'three/tsl'
import { noise3D, fbm, ridgedFbm, erosionFbm } from '../lib/noise'
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
    lacunarity: uniform(1.92),     // slightly below 2.0 to avoid lattice alignment
    gain: uniform(0.45),
    terrainHeight: uniform(0.15),
    seaLevel: uniform(defaultPalette.seaLevel),
    warpStrength: uniform(0.55),
    ridgeStrength: uniform(0.12),  // how prominent ridged mountains are on land
    erosionStrength: uniform(0.0), // 0=smooth standard, 1=full erosion (flat valleys, rough peaks)
    sunDirection: uniform(new Vector3(1, 0.3, 0.5).normalize()),
    cloudRotationY: uniform(0.0),
    cloudShadow: uniform(0.3),
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

    return continent.add(ridges.mul(uniforms.ridgeStrength).mul(landMask)).add(detail.mul(highMask))
  })

  // Cloud shadow sampling (matches cloud shader warp offsets)
  const getCloudShadow = Fn(([pos]) => {
    const cosR = cos(uniforms.cloudRotationY)
    const sinR = sin(uniforms.cloudRotationY)
    const cloudPos = vec3(
      pos.x.mul(cosR).sub(pos.z.mul(sinR)),
      pos.y,
      pos.x.mul(sinR).add(pos.z.mul(cosR))
    )

    const cScaled = cloudPos.add(uniforms.seed).mul(3.0)
    const cw1x = noise3D(cScaled.add(vec3(9.2, 1.7, 4.3))).sub(0.5)
    const cw1y = noise3D(cScaled.add(vec3(2.3, 8.1, 0.7))).sub(0.5)
    const cw1z = noise3D(cScaled.add(vec3(5.7, 3.1, 9.0))).sub(0.5)
    const cwp = cScaled.add(vec3(cw1x, cw1y, cw1z).mul(uniforms.warpStrength.mul(0.6)))

    const cn = noise3D(cwp).mul(0.5)
      .add(noise3D(cwp.mul(2.2)).mul(0.25))
      .add(noise3D(cwp.mul(4.84)).mul(0.125))

    return smoothstep(float(0.48), float(0.58), cn)
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

  // --- Rocky biome coloring ---
  const getRockyColor = Fn(([pos]) => {
    const elevation = getElevation(pos)
    const sea = uniforms.seaLevel
    const cv = noise3D(warpedPos(pos).mul(3.0))

    const col = vec3(uniforms.deepOcean).toVar()
    col.assign(mix(col, vec3(uniforms.midOcean),     smoothstep(sea.sub(0.15), sea.sub(0.06), elevation)))
    col.assign(mix(col, vec3(uniforms.shallowWater), smoothstep(sea.sub(0.06), sea.sub(0.02), elevation)))
    col.assign(mix(col, vec3(uniforms.coast),        smoothstep(sea.sub(0.02), sea, elevation)))
    col.assign(mix(col, mix(vec3(uniforms.sand),    vec3(uniforms.sand2),    cv), smoothstep(sea, sea.add(0.01), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.savanna), vec3(uniforms.savanna2), cv), smoothstep(sea.add(0.01), sea.add(0.035), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.grass),   vec3(uniforms.grass2),   cv), smoothstep(sea.add(0.035), sea.add(0.06), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.forest),  vec3(uniforms.forest2),  cv), smoothstep(sea.add(0.06), sea.add(0.10), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.rock),    vec3(uniforms.rock2),    cv), smoothstep(sea.add(0.10), sea.add(0.16), elevation)))
    col.assign(mix(col, mix(vec3(uniforms.snow),    vec3(uniforms.snowDirty), cv), smoothstep(sea.add(0.16), sea.add(0.22), elevation)))

    const cloudMask = getCloudShadow(pos)
    col.assign(col.mul(float(1.0).sub(cloudMask.mul(uniforms.cloudShadow))))
    return col
  })

  // --- Gas giant banded coloring ---
  const getGasColor = Fn(([pos]) => {
    const wp = warpedPos(pos)
    const lat = pos.y // latitude proxy [-1, 1]

    // Turbulent distortion of latitude for storms
    const turbulence = noise3D(wp.mul(2.0)).sub(0.5).mul(uniforms.warpStrength.mul(0.3))
    const distortedLat = lat.add(turbulence)

    // Band pattern: high-frequency noise along latitude
    const bandCoord = vec3(distortedLat.mul(8.0), float(0.0), float(0.0))
    const band = noise3D(bandCoord)

    // Storm detail overlay
    const stormDetail = noise3D(wp.mul(4.0)).mul(0.3)

    // 3-color band system using biome uniforms
    const col = vec3(uniforms.sand).toVar() // base band color
    col.assign(mix(col, vec3(uniforms.savanna), smoothstep(0.3, 0.5, band)))
    col.assign(mix(col, vec3(uniforms.rock),    smoothstep(0.55, 0.75, band)))
    col.assign(mix(col, vec3(uniforms.forest),  smoothstep(0.7, 0.9, band.add(stormDetail))))

    // Polar darkening
    const polarFade = smoothstep(0.85, 1.0, abs(lat))
    col.assign(mix(col, col.mul(0.6), polarFade))

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

    const cloudMask = getCloudShadow(pos)
    col.assign(col.mul(float(1.0).sub(cloudMask.mul(uniforms.cloudShadow))))
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

  // Roughness per category
  material.roughnessNode = Fn(() => {
    const cat = uniforms.planetCategory

    // Rocky: varies by elevation
    const elevation = getElevation(positionLocal)
    const sea = uniforms.seaLevel
    const rockyR = float(0.8).toVar()
    rockyR.assign(mix(rockyR, float(0.75), smoothstep(sea, sea.add(0.01), elevation)))
    rockyR.assign(mix(rockyR, float(0.9),  smoothstep(sea.add(0.10), sea.add(0.16), elevation)))
    rockyR.assign(mix(rockyR, float(0.6),  smoothstep(sea.add(0.16), sea.add(0.22), elevation)))

    // Gas: matte (0.85), Liquid: slightly glossy (0.7)
    const r = mix(rockyR, float(0.85), smoothstep(1.5, 2.0, cat)).toVar()
    r.assign(mix(r, float(0.7), smoothstep(2.5, 3.0, cat)))
    return r
  })()

  material.metalnessNode = float(0.0)

  return { material, uniforms }
}
