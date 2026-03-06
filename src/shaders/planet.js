import { Vector3, MeshBasicNodeMaterial } from 'three/webgpu'
import {
  Fn, float, vec3, color, uniform,
  positionLocal, normalWorld,
  mix, smoothstep, dot, normalize
} from 'three/tsl'
import { fbm } from '../lib/noise'

export function createPlanetMaterial() {
  const uniforms = {
    noiseType: uniform(1),
    noiseScale: uniform(3.0),
    lacunarity: uniform(2.0),
    gain: uniform(0.5),
    sunDirection: uniform(new Vector3(1, 0.3, 0.5).normalize()),
  }

  const material = new MeshBasicNodeMaterial()

  material.colorNode = Fn(() => {
    const pos = positionLocal.mul(uniforms.noiseScale)
    const elevation = fbm(pos, uniforms.noiseType, float(5), uniforms.lacunarity, uniforms.gain)

    // Biome colors
    const deepWater    = color(0x0a2a4a)
    const shallowWater = color(0x1a6ea0)
    const sand         = color(0xc2b280)
    const grass        = color(0x4a7c3f)
    const forest       = color(0x2e5419)
    const rock         = color(0x6b5b4f)
    const snow         = color(0xededf0)

    // Map elevation to biomes
    const col = vec3(deepWater).toVar()
    col.assign(mix(col, shallowWater, smoothstep(0.30, 0.38, elevation)))
    col.assign(mix(col, sand,         smoothstep(0.38, 0.42, elevation)))
    col.assign(mix(col, grass,        smoothstep(0.42, 0.48, elevation)))
    col.assign(mix(col, forest,       smoothstep(0.48, 0.55, elevation)))
    col.assign(mix(col, rock,         smoothstep(0.58, 0.65, elevation)))
    col.assign(mix(col, snow,         smoothstep(0.72, 0.80, elevation)))

    // Sun lighting
    const sunLight = dot(normalWorld, normalize(uniforms.sunDirection))
    const light = smoothstep(-0.1, 1.0, sunLight).mul(0.8).add(0.2)
    col.mulAssign(light)

    return col
  })()

  return { material, uniforms }
}
