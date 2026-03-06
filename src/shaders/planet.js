import { Vector3, MeshStandardNodeMaterial } from 'three/webgpu'
import {
  Fn, float, vec3, color, uniform,
  positionLocal, normalLocal,
  mix, smoothstep, cos, sin
} from 'three/tsl'
import { fbm, gradientNoise3D } from '../lib/noise'

// ---------------------------------------------------------------------------
// Biome color palette (elevation-based)
// ---------------------------------------------------------------------------

const BIOME_COLORS = {
  deepOcean:    0x0a1e3d,
  midOcean:     0x0c3d6b,
  shallowWater: 0x1a6e8e,
  coast:        0x2a8a8a,
  sand:         0xc2a55a,
  sand2:        0xd4b86a,
  savanna:      0x8a9a3a,
  savanna2:     0xa0a848,
  grass:        0x4a7a2e,
  grass2:       0x3a6e28,
  forest:       0x1e4a18,
  forest2:      0x2a5a1a,
  rock:         0x6a5a48,
  rock2:        0x524030,
  snow:         0xf2f2f8,
  snowDirty:    0xc8c0b8,
}

// ---------------------------------------------------------------------------
// Planet material
// ---------------------------------------------------------------------------

export function createPlanetMaterial() {
  const uniforms = {
    noiseType: uniform(2),
    noiseScale: uniform(2.2),
    lacunarity: uniform(2.2),
    gain: uniform(0.45),
    terrainHeight: uniform(0.45),
    seaLevel: uniform(0.50),
    warpStrength: uniform(0.55),
    sunDirection: uniform(new Vector3(1, 0.3, 0.5).normalize()),
    cloudRotationY: uniform(0.0),
    cloudShadow: uniform(0.3),
    seed: uniform(new Vector3(0, 0, 0)),
  }

  const material = new MeshStandardNodeMaterial()

  // Domain warping — single layer
  const warpedPos = Fn(([pos]) => {
    const scaled = pos.add(uniforms.seed).mul(uniforms.noiseScale)

    const warp1x = gradientNoise3D(scaled.add(vec3(0.0, 4.7, 2.3))).sub(0.5)
    const warp1y = gradientNoise3D(scaled.add(vec3(1.3, 0.0, 6.7))).sub(0.5)
    const warp1z = gradientNoise3D(scaled.add(vec3(3.7, 8.1, 0.0))).sub(0.5)

    return scaled.add(vec3(warp1x, warp1y, warp1z).mul(uniforms.warpStrength))
  })

  // Terrain elevation with mountain detail
  const getElevation = Fn(([pos]) => {
    const wp = warpedPos(pos)
    const base = fbm(wp, uniforms.noiseType, float(4), uniforms.lacunarity, uniforms.gain)

    const highMask = smoothstep(uniforms.seaLevel.add(0.04), uniforms.seaLevel.add(0.12), base)
    const sharpDetail = gradientNoise3D(pos.add(uniforms.seed).mul(uniforms.noiseScale.mul(4.0))).sub(0.5).mul(0.04)

    return base.add(sharpDetail.mul(highMask))
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
    const cw1x = gradientNoise3D(cScaled.add(vec3(9.2, 1.7, 4.3))).sub(0.5)
    const cw1y = gradientNoise3D(cScaled.add(vec3(2.3, 8.1, 0.7))).sub(0.5)
    const cw1z = gradientNoise3D(cScaled.add(vec3(5.7, 3.1, 9.0))).sub(0.5)
    const cwp = cScaled.add(vec3(cw1x, cw1y, cw1z).mul(uniforms.warpStrength.mul(0.6)))

    // 3-octave FBM
    const cn = gradientNoise3D(cwp).mul(0.5)
      .add(gradientNoise3D(cwp.mul(2.2)).mul(0.25))
      .add(gradientNoise3D(cwp.mul(4.84)).mul(0.125))

    return smoothstep(float(0.48), float(0.58), cn)
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

  // Biome coloring + cloud shadow
  material.colorNode = Fn(() => {
    const pos = positionLocal
    const elevation = getElevation(pos)
    const sea = uniforms.seaLevel

    // Color variation from warped noise
    const cv = gradientNoise3D(warpedPos(pos).mul(3.0))

    const c = BIOME_COLORS
    const col = vec3(color(c.deepOcean)).toVar()
    col.assign(mix(col, color(c.midOcean),     smoothstep(sea.sub(0.15), sea.sub(0.06), elevation)))
    col.assign(mix(col, color(c.shallowWater), smoothstep(sea.sub(0.06), sea.sub(0.02), elevation)))
    col.assign(mix(col, color(c.coast),        smoothstep(sea.sub(0.02), sea, elevation)))
    col.assign(mix(col, mix(color(c.sand),    color(c.sand2),    cv), smoothstep(sea, sea.add(0.01), elevation)))
    col.assign(mix(col, mix(color(c.savanna), color(c.savanna2), cv), smoothstep(sea.add(0.01), sea.add(0.035), elevation)))
    col.assign(mix(col, mix(color(c.grass),   color(c.grass2),   cv), smoothstep(sea.add(0.035), sea.add(0.06), elevation)))
    col.assign(mix(col, mix(color(c.forest),  color(c.forest2),  cv), smoothstep(sea.add(0.06), sea.add(0.10), elevation)))
    col.assign(mix(col, mix(color(c.rock),    color(c.rock2),    cv), smoothstep(sea.add(0.10), sea.add(0.16), elevation)))
    col.assign(mix(col, mix(color(c.snow),    color(c.snowDirty), cv), smoothstep(sea.add(0.16), sea.add(0.22), elevation)))

    // Darken surface under clouds
    const cloudMask = getCloudShadow(pos)
    col.assign(col.mul(float(1.0).sub(cloudMask.mul(uniforms.cloudShadow))))

    return col
  })()

  // Roughness per biome
  material.roughnessNode = Fn(() => {
    const elevation = getElevation(positionLocal)
    const sea = uniforms.seaLevel

    const r = float(0.55).toVar()
    r.assign(mix(r, float(0.75), smoothstep(sea, sea.add(0.01), elevation)))
    r.assign(mix(r, float(0.9),  smoothstep(sea.add(0.10), sea.add(0.16), elevation)))
    r.assign(mix(r, float(0.6),  smoothstep(sea.add(0.16), sea.add(0.22), elevation)))
    return r
  })()

  material.metalnessNode = float(0.0)

  return { material, uniforms }
}
