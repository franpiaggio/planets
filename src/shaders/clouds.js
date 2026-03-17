import { Color, MeshBasicNodeMaterial, FrontSide } from 'three/webgpu'
import {
  Fn, float, vec3, uniform,
  positionLocal, normalWorld,
  normalize, dot, smoothstep, mix, pow
} from 'three/tsl'
import { gradientNoise3D } from '../lib/noise'

export function createCloudMaterial(planetUniforms, atmosUniforms) {
  const uniforms = {
    cloudScale: uniform(3.0),
    cloudDensity: uniform(0.48),
    cloudSharpness: uniform(3.0),
    cloudOpacity: uniform(0.45),
    cloudColor: uniform(new Color(0xffffff)),
    surfaceTint: uniform(0.1),
    uTime: uniform(0.0),
  }

  // 4-octave FBM for richer cloud detail
  const cloudFbm = Fn(([p]) => {
    return gradientNoise3D(p).mul(0.5)
      .add(gradientNoise3D(p.mul(2.15)).mul(0.25))
      .add(gradientNoise3D(p.mul(4.6)).mul(0.125))
      .add(gradientNoise3D(p.mul(9.8)).mul(0.0625))
  })

  // Domain warping — slow drift
  const warpedCloudPos = Fn(([pos]) => {
    const timeOffset = vec3(
      uniforms.uTime.mul(0.006),
      uniforms.uTime.mul(0.004),
      uniforms.uTime.mul(0.005)
    )
    const scaled = pos.add(planetUniforms.seed).add(timeOffset).mul(uniforms.cloudScale)

    const warp1x = gradientNoise3D(scaled.add(vec3(9.2, 1.7, 4.3))).sub(0.5)
    const warp1y = gradientNoise3D(scaled.add(vec3(2.3, 8.1, 0.7))).sub(0.5)
    const warp1z = gradientNoise3D(scaled.add(vec3(5.7, 3.1, 9.0))).sub(0.5)

    return scaled.add(vec3(warp1x, warp1y, warp1z).mul(planetUniforms.warpStrength.mul(0.5)))
  })

  // Cloud shape
  const getCloudShape = Fn(([pos]) => {
    const wp = warpedCloudPos(pos)
    const noise = cloudFbm(wp)
    return smoothstep(
      uniforms.cloudDensity,
      uniforms.cloudDensity.add(float(1.0).div(uniforms.cloudSharpness)),
      noise
    )
  })

  const material = new MeshBasicNodeMaterial()

  material.colorNode = Fn(() => {
    const pos = positionLocal
    const cloud = getCloudShape(pos)

    // Sun shading
    const sunDot = dot(normalWorld, normalize(planetUniforms.sunDirection))
    const dayMask = smoothstep(-0.1, 0.2, sunDot)
    const shade = smoothstep(-0.5, 0.8, sunDot).mul(0.4).add(0.6)

    // Shadow tint — clouds on the dark side get a cool/warm tint from atmosphere
    const shadowTint = mix(vec3(atmosUniforms.twilightColor), vec3(uniforms.cloudColor), shade)

    // Thickness variation — thicker clouds are slightly darker/more saturated
    const thickness = pow(cloud, float(0.6))
    const thickDarken = mix(float(1.0), float(0.82), thickness)

    // Atmosphere bleed at thin edges
    const edgeFade = smoothstep(0.6, 0.15, cloud)
    const atmosTint = mix(vec3(1.0, 1.0, 1.0), vec3(atmosUniforms.atmosphereColor), edgeFade.mul(0.15))

    return shadowTint.mul(atmosTint).mul(thickDarken).mul(cloud).mul(dayMask)
  })()

  material.opacityNode = Fn(() => {
    const cloud = getCloudShape(positionLocal)
    const sunDot = dot(normalWorld, normalize(planetUniforms.sunDirection))
    const dayMask = smoothstep(-0.1, 0.2, sunDot)
    return cloud.mul(uniforms.cloudOpacity).mul(dayMask)
  })()

  material.transparent = true
  material.depthWrite = false
  material.side = FrontSide

  return { material, uniforms }
}
