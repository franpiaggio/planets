import { Color, MeshBasicNodeMaterial, BackSide, AdditiveBlending } from 'three/webgpu'
import {
  Fn, float, vec3, uniform,
  positionWorld, positionLocal, normalWorld, cameraPosition,
  normalize, dot, pow, mix, smoothstep, clamp
} from 'three/tsl'
import { gradientNoise3D } from '../lib/noise'

// Outer glow — BackSide sphere slightly larger than planet
export function createAtmosphereMaterial(planetUniforms) {
  const uniforms = {
    atmosphereColor: uniform(new Color(0x6baaee)),
    twilightColor: uniform(new Color(0xd4845a)),
    glowIntensity: uniform(0.5),
    glowCoefficient: uniform(0.55),
    glowPower: uniform(8.0),
  }

  const material = new MeshBasicNodeMaterial()

  material.colorNode = Fn(() => {
    // View-dependent glow: intensity = pow(coefficient - dot(normal, viewDir), power)
    // On BackSide, normals point inward — so dot(normal, viewDir) is negative at edges
    const viewDir = normalize(cameraPosition.sub(positionWorld))
    const nDotV = dot(normalWorld, viewDir)

    // For BackSide: nDotV is ~0 at edges (where we want glow) and negative facing away
    const intensity = pow(
      clamp(uniforms.glowCoefficient.sub(nDotV), float(0.0), float(1.0)),
      uniforms.glowPower
    )

    // Sun blending: day = blue, narrow twilight = warm tint, night = off
    const sunDot = dot(normalWorld, normalize(planetUniforms.sunDirection))
    // Narrower twilight band for subtler transition
    const twilightMask = smoothstep(-0.15, 0.05, sunDot).mul(smoothstep(0.2, 0.0, sunDot))
    const dayMask = smoothstep(-0.2, 0.15, sunDot)

    // Mix less aggressively into twilight — mostly blue with a hint of warmth
    const col = mix(uniforms.atmosphereColor, uniforms.twilightColor, twilightMask.mul(0.5))

    // Subtle surface color bleed — atmosphere picks up warm/cool from below
    const surfaceNoise = gradientNoise3D(positionLocal.mul(2.0))
    const warmShift = vec3(1.0, 0.96, 0.9)
    const coolShift = vec3(0.9, 0.96, 1.0)
    const surfaceTint = mix(coolShift, warmShift, surfaceNoise)

    return col.mul(surfaceTint).mul(intensity).mul(dayMask).mul(uniforms.glowIntensity)
  })()

  material.opacityNode = float(1.0)
  material.transparent = true
  material.depthWrite = false
  material.side = BackSide
  material.blending = AdditiveBlending

  return { material, uniforms }
}

// Inner glow — applied as emissive on the planet material
export function applyInnerGlow(planetMaterial, planetUniforms, atmosUniforms) {
  planetMaterial.emissiveNode = Fn(() => {
    const viewDir = normalize(cameraPosition.sub(positionWorld))
    const nDotV = dot(normalWorld, viewDir).clamp(0.0, 1.0)

    // Fresnel rim on the planet surface itself
    const rimIntensity = pow(float(1.0).sub(nDotV), float(4.0))

    // Sun-facing side only
    const sunDot = dot(normalWorld, normalize(planetUniforms.sunDirection))
    const dayMask = smoothstep(-0.15, 0.15, sunDot)
    const twilightMask = smoothstep(-0.15, 0.05, sunDot).mul(smoothstep(0.2, 0.0, sunDot))

    const col = mix(atmosUniforms.atmosphereColor, atmosUniforms.twilightColor, twilightMask.mul(0.4))

    return col.mul(rimIntensity).mul(dayMask).mul(0.3)
  })()
}
