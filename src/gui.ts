import GUI from 'lil-gui'
import type { Vector3, Color } from 'three'

interface PlanetUniforms {
  noiseType: { value: number }
  noiseScale: { value: number }
  lacunarity: { value: number }
  gain: { value: number }
  terrainHeight: { value: number }
  seaLevel: { value: number }
  warpStrength: { value: number }
  sunDirection: { value: Vector3 }
}

interface CloudUniforms {
  cloudScale: { value: number }
  cloudDensity: { value: number }
  cloudSharpness: { value: number }
  cloudOpacity: { value: number }
  cloudColor: { value: Color }
}

interface AtmosphereUniforms {
  atmosphereColor: { value: Color }
  twilightColor: { value: Color }
  glowIntensity: { value: number }
  glowCoefficient: { value: number }
  glowPower: { value: number }
}

const NOISE_TYPES: Record<string, number> = {
  'Perlin': 1,
  'Simplex': 2,
}

interface PostUniforms {
  passes: {
    [key: string]: any
  }
  rawNodes: {
    bloom: { strength: { value: number }; radius: { value: number }; threshold: { value: number } }
    starBloom: { strength: { value: number }; radius: { value: number }; threshold: { value: number } }
  }
  renderer: { toneMappingExposure: number }
  toggleEffect: (name: string, enabled: boolean) => void
  effectToggles: Record<string, boolean>
}

export function setupGui(planetUniforms: PlanetUniforms, atmosUniforms: AtmosphereUniforms, cloudUniforms: CloudUniforms, postUniforms: PostUniforms) {
  const gui = new GUI({ title: 'Planet Controls' })

  const params = {
    noiseType: 'Simplex',
    noiseScale: planetUniforms.noiseScale.value,
    lacunarity: planetUniforms.lacunarity.value,
    gain: planetUniforms.gain.value,
    terrainHeight: planetUniforms.terrainHeight.value,
    seaLevel: planetUniforms.seaLevel.value,
    warpStrength: planetUniforms.warpStrength.value,
    atmosphereColor: '#' + atmosUniforms.atmosphereColor.value.getHexString(),
    twilightColor: '#' + atmosUniforms.twilightColor.value.getHexString(),
    glowIntensity: atmosUniforms.glowIntensity.value,
    glowCoefficient: atmosUniforms.glowCoefficient.value,
    glowPower: atmosUniforms.glowPower.value,
  }

  // Randomize button
  const randomize = () => {
    const types = Object.keys(NOISE_TYPES)
    const type = types[Math.floor(Math.random() * types.length)]
    params.noiseType = type
    planetUniforms.noiseType.value = NOISE_TYPES[type]
    params.noiseScale = 1.5 + Math.random() * 3.5
    planetUniforms.noiseScale.value = params.noiseScale
    params.lacunarity = 1.5 + Math.random() * 1.5
    planetUniforms.lacunarity.value = params.lacunarity
    params.gain = 0.2 + Math.random() * 0.5
    planetUniforms.gain.value = params.gain
    params.terrainHeight = 0.1 + Math.random() * 0.8
    planetUniforms.terrainHeight.value = params.terrainHeight
    params.seaLevel = 0.35 + Math.random() * 0.2
    planetUniforms.seaLevel.value = params.seaLevel
    params.warpStrength = 0.1 + Math.random() * 1.5
    planetUniforms.warpStrength.value = params.warpStrength
    gui.controllersRecursive().forEach(c => c.updateDisplay())
  }

  gui.add({ randomize }, 'randomize').name('🎲 Randomize Planet')

  // Noise
  const noiseFolder = gui.addFolder('Noise')

  noiseFolder.add(params, 'noiseType', Object.keys(NOISE_TYPES)).name('Type').onChange((v: string) => {
    planetUniforms.noiseType.value = NOISE_TYPES[v]
  })

  noiseFolder.add(params, 'noiseScale', 0.5, 10, 0.1).name('Scale').onChange((v: number) => {
    planetUniforms.noiseScale.value = v
  })

  noiseFolder.add(params, 'lacunarity', 1.0, 4.0, 0.1).name('Lacunarity').onChange((v: number) => {
    planetUniforms.lacunarity.value = v
  })

  noiseFolder.add(params, 'gain', 0.1, 0.9, 0.05).name('Gain').onChange((v: number) => {
    planetUniforms.gain.value = v
  })

  noiseFolder.open()

  // Terrain
  const terrainFolder = gui.addFolder('Terrain')

  terrainFolder.add(params, 'terrainHeight', 0.0, 2.0, 0.01).name('Height').onChange((v: number) => {
    planetUniforms.terrainHeight.value = v
  })

  terrainFolder.add(params, 'seaLevel', 0.2, 0.7, 0.01).name('Sea Level').onChange((v: number) => {
    planetUniforms.seaLevel.value = v
  })

  terrainFolder.add(params, 'warpStrength', 0.0, 5.0, 0.05).name('Warp').onChange((v: number) => {
    planetUniforms.warpStrength.value = v
  })

  terrainFolder.open()

  // Clouds
  const cloudFolder = gui.addFolder('Clouds')

  const cloudParams = {
    cloudScale: cloudUniforms.cloudScale.value,
    cloudDensity: cloudUniforms.cloudDensity.value,
    cloudSharpness: cloudUniforms.cloudSharpness.value,
    cloudOpacity: cloudUniforms.cloudOpacity.value,
    cloudColor: '#' + cloudUniforms.cloudColor.value.getHexString(),
  }

  cloudFolder.add(cloudParams, 'cloudScale', 1.0, 10.0, 0.1).name('Scale').onChange((v: number) => {
    cloudUniforms.cloudScale.value = v
  })

  cloudFolder.add(cloudParams, 'cloudDensity', 0.0, 1.0, 0.01).name('Coverage').onChange((v: number) => {
    cloudUniforms.cloudDensity.value = v
  })

  cloudFolder.add(cloudParams, 'cloudSharpness', 1.0, 10.0, 0.1).name('Sharpness').onChange((v: number) => {
    cloudUniforms.cloudSharpness.value = v
  })

  cloudFolder.add(cloudParams, 'cloudOpacity', 0.0, 1.0, 0.05).name('Opacity').onChange((v: number) => {
    cloudUniforms.cloudOpacity.value = v
  })

  cloudFolder.addColor(cloudParams, 'cloudColor').name('Color').onChange((v: string) => {
    cloudUniforms.cloudColor.value.set(v)
  })

  cloudFolder.open()

  // Atmosphere
  const atmosFolder = gui.addFolder('Atmosphere')

  atmosFolder.addColor(params, 'atmosphereColor').name('Day Color').onChange((v: string) => {
    atmosUniforms.atmosphereColor.value.set(v)
  })

  atmosFolder.addColor(params, 'twilightColor').name('Twilight Color').onChange((v: string) => {
    atmosUniforms.twilightColor.value.set(v)
  })

  atmosFolder.add(params, 'glowIntensity', 0.0, 3.0, 0.05).name('Intensity').onChange((v: number) => {
    atmosUniforms.glowIntensity.value = v
  })

  atmosFolder.add(params, 'glowCoefficient', 0.0, 1.0, 0.05).name('Coefficient').onChange((v: number) => {
    atmosUniforms.glowCoefficient.value = v
  })

  atmosFolder.add(params, 'glowPower', 1.0, 10.0, 0.1).name('Power').onChange((v: number) => {
    atmosUniforms.glowPower.value = v
  })

  atmosFolder.open()

  // Post-processing
  const postFolder = gui.addFolder('Post Processing')

  postFolder.add({ exposure: postUniforms.renderer.toneMappingExposure }, 'exposure', 0.5, 3.0, 0.05).name('Exposure').onChange((v: number) => {
    postUniforms.renderer.toneMappingExposure = v
  })

  // Bloom (stars only — high threshold)
  const bloomFolder = postFolder.addFolder('Bloom')
  bloomFolder.add({ enabled: postUniforms.effectToggles.bloom }, 'enabled').name('Enabled').onChange((v: boolean) => {
    postUniforms.toggleEffect('bloom', v)
  })
  const bp = postUniforms.rawNodes.bloom
  bloomFolder.add({ v: bp.strength.value }, 'v', 0.0, 3.0, 0.05).name('Strength').onChange((v: number) => { bp.strength.value = v })
  bloomFolder.add({ v: bp.radius.value }, 'v', 0.0, 1.0, 0.05).name('Radius').onChange((v: number) => { bp.radius.value = v })
  bloomFolder.add({ v: bp.threshold.value }, 'v', 0.0, 3.0, 0.05).name('Threshold').onChange((v: number) => { bp.threshold.value = v })

  // Anamorphic
  const anaFolder = postFolder.addFolder('Anamorphic')
  anaFolder.add({ enabled: postUniforms.effectToggles.anamorphic }, 'enabled').name('Enabled').onChange((v: boolean) => {
    postUniforms.toggleEffect('anamorphic', v)
  })
  const ap = postUniforms.passes.anamorphic
  anaFolder.add({ v: ap._thresholdUniform.value }, 'v', 0.0, 2.0, 0.05).name('Threshold').onChange((v: number) => { ap._thresholdUniform.value = v })
  anaFolder.add({ v: ap._scaleUniform.value }, 'v', 0.5, 10.0, 0.1).name('Scale').onChange((v: number) => { ap._scaleUniform.value = v })

  // DOF
  const dofFolder = postFolder.addFolder('Depth of Field')
  dofFolder.add({ enabled: postUniforms.effectToggles.dof }, 'enabled').name('Enabled').onChange((v: boolean) => {
    postUniforms.toggleEffect('dof', v)
  })
  const dp = postUniforms.passes.dof
  dofFolder.add({ v: dp._focusUniform.value }, 'v', 0.5, 20.0, 0.1).name('Focus Distance').onChange((v: number) => { dp._focusUniform.value = v })
  dofFolder.add({ v: dp._apertureUniform.value }, 'v', 0.001, 0.1, 0.001).name('Aperture').onChange((v: number) => { dp._apertureUniform.value = v })
  dofFolder.add({ v: dp._maxblurUniform.value }, 'v', 0.0, 2.0, 0.05).name('Max Blur').onChange((v: number) => { dp._maxblurUniform.value = v })

  // AO
  const aoFolder = postFolder.addFolder('Ambient Occlusion')
  aoFolder.add({ enabled: postUniforms.effectToggles.ao }, 'enabled').name('Enabled').onChange((v: boolean) => {
    postUniforms.toggleEffect('ao', v)
  })

  // SSR
  const ssrFolder = postFolder.addFolder('SSR Reflections')
  ssrFolder.add({ enabled: postUniforms.effectToggles.ssr }, 'enabled').name('Enabled').onChange((v: boolean) => {
    postUniforms.toggleEffect('ssr', v)
  })

  postFolder.open()
}
