import { Vector3, Color, MeshStandardNodeMaterial } from 'three/webgpu'
import {
  Fn, float, vec3, uniform,
  positionLocal, normalLocal,
  mix, smoothstep, cos, sin
} from 'three/tsl'
import { fbm, gradientNoise3D } from '../lib/noise'
import { PALETTES } from '../palettes'

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
    noiseType: uniform(2),
    noiseScale: uniform(2.2),
    lacunarity: uniform(2.2),
    gain: uniform(0.45),
    terrainHeight: uniform(0.45),
    seaLevel: uniform(defaultPalette.seaLevel),
    warpStrength: uniform(0.55),
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
    const cv = gradientNoise3D(warpedPos(pos).mul(3.0))

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
