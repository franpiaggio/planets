import { Color, MeshBasicNodeMaterial, FrontSide } from 'three/webgpu'
import {
  Fn, float, vec3, uniform,
  positionLocal, normalWorld,
  normalize, dot, smoothstep, mix
} from 'three/tsl'
import { fbm, gradientNoise3D } from '../lib/noise'

export function createCloudMaterial(planetUniforms, atmosUniforms) {
  const uniforms = {
    cloudScale: uniform(3.0),
    cloudDensity: uniform(0.48),
    cloudSharpness: uniform(3.0),
    cloudOpacity: uniform(0.45),
    cloudColor: uniform(new Color(0xffffff)),
    surfaceTint: uniform(0.1),
  }

  // Domain warping for clouds — same technique as terrain, different offsets
  const warpedCloudPos = Fn(([pos]) => {
    const scaled = pos.add(planetUniforms.seed).mul(uniforms.cloudScale)

    const warp1x = gradientNoise3D(scaled.add(vec3(9.2, 1.7, 4.3))).sub(0.5)
    const warp1y = gradientNoise3D(scaled.add(vec3(2.3, 8.1, 0.7))).sub(0.5)
    const warp1z = gradientNoise3D(scaled.add(vec3(5.7, 3.1, 9.0))).sub(0.5)

    return scaled.add(vec3(warp1x, warp1y, warp1z).mul(planetUniforms.warpStrength.mul(0.6)))
  })

  const material = new MeshBasicNodeMaterial()

  material.colorNode = Fn(() => {
    const pos = positionLocal

    // Cloud shape with domain warping
    const wp = warpedCloudPos(pos)
    const noise = fbm(wp, float(1), float(4), float(2.2), float(0.5))
    const cloud = smoothstep(
      uniforms.cloudDensity,
      uniforms.cloudDensity.add(float(1.0).div(uniforms.cloudSharpness)),
      noise
    )

    // Sun shading — hide clouds on night side
    const sunDot = dot(normalWorld, normalize(planetUniforms.sunDirection))
    const dayMask = smoothstep(-0.1, 0.2, sunDot)
    const shade = smoothstep(-0.5, 0.8, sunDot).mul(0.4).add(0.6)

    // Subtle surface reflection: warm (land) vs cool (ocean)
    const surfaceNoise = gradientNoise3D(pos.mul(2.5))
    const warmTint = vec3(1.0, 0.96, 0.9)
    const coolTint = vec3(0.9, 0.95, 1.0)
    const surfaceColor = mix(coolTint, warmTint, surfaceNoise)

    // Atmosphere bleed at thin edges
    const edgeFade = smoothstep(0.7, 0.2, cloud)
    const atmosTint = mix(vec3(1.0, 1.0, 1.0), vec3(atmosUniforms.atmosphereColor), edgeFade.mul(0.12))

    const tintedCloud = mix(uniforms.cloudColor, surfaceColor, uniforms.surfaceTint)
    return tintedCloud.mul(atmosTint).mul(shade).mul(cloud).mul(dayMask)
  })()

  material.opacityNode = Fn(() => {
    const wp = warpedCloudPos(positionLocal)
    const noise = fbm(wp, float(1), float(4), float(2.2), float(0.5))
    const cloud = smoothstep(
      uniforms.cloudDensity,
      uniforms.cloudDensity.add(float(1.0).div(uniforms.cloudSharpness)),
      noise
    )
    const sunDot = dot(normalWorld, normalize(planetUniforms.sunDirection))
    const dayMask = smoothstep(-0.1, 0.2, sunDot)
    return cloud.mul(uniforms.cloudOpacity).mul(dayMask)
  })()

  material.transparent = true
  material.depthWrite = false
  material.side = FrontSide

  return { material, uniforms }
}
