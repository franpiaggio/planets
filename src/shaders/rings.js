import { Color, MeshBasicNodeMaterial, DoubleSide } from 'three/webgpu'
import {
  Fn, float, vec3, uniform,
  uv, positionLocal, positionWorld,
  normalize, dot, smoothstep, mix, sin, length
} from 'three/tsl'
import { gradientNoise3D } from '../lib/noise'

export function createRingMaterial(planetUniforms) {
  const uniforms = {
    ringColor1: uniform(new Color(0xc8b888)),
    ringColor2: uniform(new Color(0x8a7858)),
    ringColor3: uniform(new Color(0xa09070)),
    ringOpacity: uniform(0.7),
    innerRadius: uniform(1.4),
    outerRadius: uniform(2.4),
    bandFreq: uniform(40.0),
    bandFreq2: uniform(90.0),
    gapPos1: uniform(0.40),
    gapWidth1: uniform(0.02),
    gapPos2: uniform(0.60),
    gapWidth2: uniform(0.02),
    gapPos3: uniform(0.80),
    gapWidth3: uniform(0.02),
    innerTrim: uniform(0.0),
    outerTrim: uniform(0.0),
    densityVar: uniform(0.15),
  }

  const material = new MeshBasicNodeMaterial()

  material.colorNode = Fn(() => {
    // Compute radial distance from position (not UV) for correct concentric bands
    const dist = length(positionLocal.xy)
    const r = dist.sub(uniforms.innerRadius).div(uniforms.outerRadius.sub(uniforms.innerRadius))
    const angle = uv().y

    // Warp the radial coordinate with noise so bands aren't perfectly straight
    const warpPos = vec3(r.mul(4.0), angle.mul(12.0), float(0.5))
    const warp = gradientNoise3D(warpPos).mul(0.015)
    const rWarped = r.add(warp)

    // Concentric bands at configurable frequencies (using warped r)
    const band1 = sin(rWarped.mul(uniforms.bandFreq)).mul(0.5).add(0.5)
    const band2 = sin(rWarped.mul(uniforms.bandFreq2)).mul(0.5).add(0.5)

    // Multi-scale noise for organic variation
    const noisePos1 = vec3(r.mul(6.0), angle.mul(8.0), float(0.0))
    const noisePos2 = vec3(r.mul(18.0), angle.mul(25.0), float(3.0))
    const noise = gradientNoise3D(noisePos1).mul(0.7).add(gradientNoise3D(noisePos2).mul(0.3))

    // Mix colors based on bands + noise
    const col = mix(vec3(uniforms.ringColor1), vec3(uniforms.ringColor2), band1.mul(0.5).add(noise.mul(0.3)))
    const col2 = mix(col, vec3(uniforms.ringColor3), band2.mul(0.3).add(noise.mul(0.15)))

    // Sun illumination — position-based, not normal-based
    // (ring is a flat disc so normalWorld is constant across all fragments)
    const sunDir = normalize(planetUniforms.sunDirection)
    const fragDir = normalize(positionWorld)

    // Which side of the planet this fragment is on relative to sun
    const sunAlignment = dot(fragDir, sunDir)
    const shade = smoothstep(-0.4, 0.6, sunAlignment).mul(0.85).add(0.15)

    // Planet shadow — fragments behind the planet (close to center) get darkened
    const distFromCenter = length(positionWorld.xz)
    const inShadowZone = smoothstep(1.5, 1.15, distFromCenter)  // closer = more shadow
    const behindPlanet = smoothstep(0.1, -0.15, sunAlignment)   // behind planet vs sun
    const planetShadow = float(1.0).sub(inShadowZone.mul(behindPlanet).mul(0.85))

    return col2.mul(shade).mul(planetShadow)
  })()

  material.opacityNode = Fn(() => {
    const dist = length(positionLocal.xy)
    const r = dist.sub(uniforms.innerRadius).div(uniforms.outerRadius.sub(uniforms.innerRadius))

    // Configurable gaps
    const halfW1 = uniforms.gapWidth1.mul(0.5)
    const gap1 = smoothstep(uniforms.gapPos1.sub(halfW1), uniforms.gapPos1, r)
      .mul(smoothstep(uniforms.gapPos1.add(halfW1), uniforms.gapPos1, r))

    const halfW2 = uniforms.gapWidth2.mul(0.5)
    const gap2 = smoothstep(uniforms.gapPos2.sub(halfW2), uniforms.gapPos2, r)
      .mul(smoothstep(uniforms.gapPos2.add(halfW2), uniforms.gapPos2, r))

    const halfW3 = uniforms.gapWidth3.mul(0.5)
    const gap3 = smoothstep(uniforms.gapPos3.sub(halfW3), uniforms.gapPos3, r)
      .mul(smoothstep(uniforms.gapPos3.add(halfW3), uniforms.gapPos3, r))

    const gaps = float(1.0).sub(gap1).sub(gap2).sub(gap3)

    // Trim + edge fade
    const innerFade = smoothstep(uniforms.innerTrim, uniforms.innerTrim.add(0.08), r)
    const outerFade = smoothstep(float(1.0).sub(uniforms.outerTrim), float(1.0).sub(uniforms.outerTrim).sub(0.08), r)

    // Band density modulation with noise variation
    const densityNoise = gradientNoise3D(vec3(r.mul(10.0), uv().y.mul(15.0), float(7.0))).mul(0.08)
    const density = sin(r.mul(uniforms.bandFreq.mul(1.25))).mul(uniforms.densityVar).add(float(1.0).sub(uniforms.densityVar)).add(densityNoise)

    return gaps.mul(innerFade).mul(outerFade).mul(density).mul(uniforms.ringOpacity)
  })()

  material.transparent = true
  material.depthWrite = false
  material.side = DoubleSide

  return { material, uniforms }
}

// ---------------------------------------------------------------------------
// Ring style presets
// ---------------------------------------------------------------------------

export const RING_STYLES = [
  {
    bandFreq: 40, bandFreq2: 90,
    gapPos1: 0.40, gapWidth1: 0.03,
    gapPos2: 0.60, gapWidth2: 0.02,
    gapPos3: 0.80, gapWidth3: 0.02,
    innerTrim: 0.0, outerTrim: 0.0,
    densityVar: 0.15, opacity: 0.7,
  },
  {
    bandFreq: 60, bandFreq2: 120,
    gapPos1: -1, gapWidth1: 0,
    gapPos2: -1, gapWidth2: 0,
    gapPos3: -1, gapWidth3: 0,
    innerTrim: 0.25, outerTrim: 0.35,
    densityVar: 0.05, opacity: 0.8,
  },
  {
    bandFreq: 30, bandFreq2: 70,
    gapPos1: 0.48, gapWidth1: 0.10,
    gapPos2: -1, gapWidth2: 0,
    gapPos3: -1, gapWidth3: 0,
    innerTrim: 0.0, outerTrim: 0.0,
    densityVar: 0.10, opacity: 0.65,
  },
  {
    bandFreq: 80, bandFreq2: 160,
    gapPos1: 0.35, gapWidth1: 0.01,
    gapPos2: 0.55, gapWidth2: 0.01,
    gapPos3: 0.75, gapWidth3: 0.01,
    innerTrim: 0.05, outerTrim: 0.10,
    densityVar: 0.30, opacity: 0.35,
  },
  {
    bandFreq: 50, bandFreq2: 100,
    gapPos1: 0.50, gapWidth1: 0.015,
    gapPos2: -1, gapWidth2: 0,
    gapPos3: -1, gapWidth3: 0,
    innerTrim: 0.15, outerTrim: 0.20,
    densityVar: 0.08, opacity: 0.85,
  },
  {
    bandFreq: 100, bandFreq2: 50,
    gapPos1: 0.30, gapWidth1: 0.08,
    gapPos2: 0.55, gapWidth2: 0.08,
    gapPos3: 0.78, gapWidth3: 0.08,
    innerTrim: 0.0, outerTrim: 0.0,
    densityVar: 0.05, opacity: 0.6,
  },
  {
    bandFreq: 20, bandFreq2: 45,
    gapPos1: -1, gapWidth1: 0,
    gapPos2: -1, gapWidth2: 0,
    gapPos3: -1, gapWidth3: 0,
    innerTrim: 0.0, outerTrim: 0.0,
    densityVar: 0.25, opacity: 0.3,
  },
  {
    bandFreq: 65, bandFreq2: 140,
    gapPos1: 0.32, gapWidth1: 0.04,
    gapPos2: 0.52, gapWidth2: 0.025,
    gapPos3: 0.72, gapWidth3: 0.035,
    innerTrim: 0.0, outerTrim: 0.05,
    densityVar: 0.20, opacity: 0.75,
  },
]
