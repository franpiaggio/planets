import { Vector3, MeshStandardNodeMaterial } from 'three/webgpu'
import {
  Fn, float, vec3, color, uniform,
  positionLocal, normalLocal,
  mix, smoothstep, cos, sin
} from 'three/tsl'
import { fbm, gradientNoise3D } from '../lib/noise'

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

  // Domain warping — single layer only (lighter on GPU)
  const warpedPos = Fn(([pos]) => {
    const scaled = pos.add(uniforms.seed).mul(uniforms.noiseScale)

    const warp1x = gradientNoise3D(scaled.add(vec3(0.0, 4.7, 2.3))).sub(0.5)
    const warp1y = gradientNoise3D(scaled.add(vec3(1.3, 0.0, 6.7))).sub(0.5)
    const warp1z = gradientNoise3D(scaled.add(vec3(3.7, 8.1, 0.0))).sub(0.5)
    const warp1 = vec3(warp1x, warp1y, warp1z).mul(uniforms.warpStrength)

    return scaled.add(warp1)
  })

  const getElevation = Fn(([pos]) => {
    const wp = warpedPos(pos)
    const base = fbm(wp, uniforms.noiseType, float(4), uniforms.lacunarity, uniforms.gain)

    // Sharp unwarped detail only on high terrain (mountains get definition)
    const highMask = smoothstep(uniforms.seaLevel.add(0.04), uniforms.seaLevel.add(0.12), base)
    const sharpDetail = gradientNoise3D(pos.add(uniforms.seed).mul(uniforms.noiseScale.mul(4.0))).sub(0.5).mul(0.04)

    return base.add(sharpDetail.mul(highMask))
  })

  // Vertex displacement
  material.positionNode = Fn(() => {
    const pos = positionLocal
    const elevation = getElevation(pos)

    const seaLevel = uniforms.seaLevel
    const landHeight = smoothstep(seaLevel, seaLevel.add(0.01), elevation)
      .mul(elevation.sub(seaLevel))
    const displacement = landHeight.mul(uniforms.terrainHeight)

    return pos.add(normalLocal.mul(displacement))
  })()

  // Color with triplanar detail and richer palette
  material.colorNode = Fn(() => {
    const pos = positionLocal
    const elevation = getElevation(pos)

    // Color variation
    const wp = warpedPos(pos)
    const colorVar = gradientNoise3D(wp.mul(3.0))

    // Earth-based color palette
    const deepOcean    = color(0x0a1e3d)
    const midOcean     = color(0x0c3d6b)
    const shallowWater = color(0x1a6e8e)
    const coast        = color(0x2a8a8a)
    const sand         = color(0xc2a55a)
    const sand2        = color(0xd4b86a)
    const savanna      = color(0x8a9a3a)
    const savanna2     = color(0xa0a848)
    const grass        = color(0x4a7a2e)
    const grass2       = color(0x3a6e28)
    const forest       = color(0x1e4a18)
    const forest2      = color(0x2a5a1a)
    const rock         = color(0x6a5a48)
    const rock2        = color(0x524030)
    const snow         = color(0xf2f2f8)
    const snowDirty    = color(0xc8c0b8)

    const sea = uniforms.seaLevel
    const cv = colorVar

    const col = vec3(deepOcean).toVar()
    col.assign(mix(col, midOcean,     smoothstep(sea.sub(0.15), sea.sub(0.06), elevation)))
    col.assign(mix(col, shallowWater, smoothstep(sea.sub(0.06), sea.sub(0.02), elevation)))
    col.assign(mix(col, coast,        smoothstep(sea.sub(0.02), sea, elevation)))
    // Sand/beach
    const sandBlend = mix(sand, sand2, cv)
    col.assign(mix(col, sandBlend,    smoothstep(sea, sea.add(0.01), elevation)))
    // Savanna/dry grassland
    const savannaBlend = mix(savanna, savanna2, cv)
    col.assign(mix(col, savannaBlend, smoothstep(sea.add(0.01), sea.add(0.035), elevation)))
    // Green grassland
    const grassBlend = mix(grass, grass2, cv)
    col.assign(mix(col, grassBlend,   smoothstep(sea.add(0.035), sea.add(0.06), elevation)))
    // Dense forest
    const forestBlend = mix(forest, forest2, cv)
    col.assign(mix(col, forestBlend,  smoothstep(sea.add(0.06), sea.add(0.10), elevation)))
    // Rock/mountain
    const rockBlend = mix(rock, rock2, cv)
    col.assign(mix(col, rockBlend,    smoothstep(sea.add(0.10), sea.add(0.16), elevation)))
    // Snow caps
    const snowBlend = mix(snow, snowDirty, cv)
    col.assign(mix(col, snowBlend,    smoothstep(sea.add(0.16), sea.add(0.22), elevation)))

    // Cloud shadow — rotate position to cloud space and sample cloud noise
    const cosR = cos(uniforms.cloudRotationY)
    const sinR = sin(uniforms.cloudRotationY)
    const cloudPos = vec3(
      pos.x.mul(cosR).sub(pos.z.mul(sinR)),
      pos.y,
      pos.x.mul(sinR).add(pos.z.mul(cosR))
    )
    // Same warp as clouds (offsets 9.2, 1.7, 4.3...)
    const cScaled = cloudPos.add(uniforms.seed).mul(3.0)
    const cw1x = gradientNoise3D(cScaled.add(vec3(9.2, 1.7, 4.3))).sub(0.5)
    const cw1y = gradientNoise3D(cScaled.add(vec3(2.3, 8.1, 0.7))).sub(0.5)
    const cw1z = gradientNoise3D(cScaled.add(vec3(5.7, 3.1, 9.0))).sub(0.5)
    const cwp = cScaled.add(vec3(cw1x, cw1y, cw1z).mul(uniforms.warpStrength.mul(0.6)))
    // Lightweight 3-octave FBM using gradientNoise3D directly (skip sampleNoise)
    const cn = gradientNoise3D(cwp).mul(0.5)
      .add(gradientNoise3D(cwp.mul(2.2)).mul(0.25))
      .add(gradientNoise3D(cwp.mul(4.84)).mul(0.125))
    const cloudMask = smoothstep(float(0.48), float(0.58), cn)
    // Darken surface under clouds
    col.assign(col.mul(float(1.0).sub(cloudMask.mul(uniforms.cloudShadow))))

    return col
  })()

  material.roughnessNode = Fn(() => {
    const pos = positionLocal
    const elevation = getElevation(pos)
    const sea = uniforms.seaLevel
    // Water smooth, sand/grass medium, rock rough, snow smoother
    const r = float(0.55).toVar()
    r.assign(mix(r, float(0.75), smoothstep(sea, sea.add(0.01), elevation)))
    r.assign(mix(r, float(0.9),  smoothstep(sea.add(0.10), sea.add(0.16), elevation)))
    r.assign(mix(r, float(0.6),  smoothstep(sea.add(0.16), sea.add(0.22), elevation)))
    return r
  })()

  material.metalnessNode = float(0.0)

  return { material, uniforms }
}
