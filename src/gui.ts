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
  seed: { value: Vector3 }
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

interface MeshVisibility {
  clouds: { visible: boolean }
  atmosphere: { visible: boolean }
}

interface PostUniforms {
  passes: {
    [key: string]: any
  }
  rawNodes: {
    bloom: { strength: { value: number }; radius: { value: number }; threshold: { value: number } }
    anamorphic: { threshold: { value: number }; scale: { value: number } }
    dof: { focus: { value: number }; aperture: { value: number }; maxblur: { value: number } }
  }
  renderer: { toneMappingExposure: number }
  toggleEffect: (name: string, enabled: boolean) => void
  togglePostProcessing: (enabled: boolean) => void
  effectToggles: Record<string, boolean>
  postProcessingEnabled: boolean
}

let guiInstance: GUI | null = null
let guiParams: any = null
let guiCloudParams: any = null
let guiVisibilityParams: any = null
let guiPlanetUniforms: PlanetUniforms | null = null
let guiAtmosUniforms: AtmosphereUniforms | null = null
let guiCloudUniforms: CloudUniforms | null = null
let guiMeshes: MeshVisibility | null = null

export function refreshGui() {
  if (!guiInstance || !guiParams || !guiPlanetUniforms || !guiAtmosUniforms || !guiCloudUniforms) return

  const p = guiPlanetUniforms
  const noiseTypeEntries = Object.entries(NOISE_TYPES)
  const found = noiseTypeEntries.find(([, v]) => v === p.noiseType.value)
  guiParams.noiseType = found ? found[0] : 'Simplex'
  guiParams.noiseScale = p.noiseScale.value
  guiParams.lacunarity = p.lacunarity.value
  guiParams.gain = p.gain.value
  guiParams.terrainHeight = p.terrainHeight.value
  guiParams.seaLevel = p.seaLevel.value
  guiParams.warpStrength = p.warpStrength.value
  guiParams.atmosphereColor = '#' + guiAtmosUniforms.atmosphereColor.value.getHexString()
  guiParams.twilightColor = '#' + guiAtmosUniforms.twilightColor.value.getHexString()
  guiParams.glowIntensity = guiAtmosUniforms.glowIntensity.value
  guiParams.glowCoefficient = guiAtmosUniforms.glowCoefficient.value
  guiParams.glowPower = guiAtmosUniforms.glowPower.value

  guiCloudParams.cloudScale = guiCloudUniforms.cloudScale.value
  guiCloudParams.cloudDensity = guiCloudUniforms.cloudDensity.value
  guiCloudParams.cloudSharpness = guiCloudUniforms.cloudSharpness.value
  guiCloudParams.cloudOpacity = guiCloudUniforms.cloudOpacity.value
  guiCloudParams.cloudColor = '#' + guiCloudUniforms.cloudColor.value.getHexString()

  if (guiVisibilityParams && guiMeshes) {
    guiVisibilityParams.showClouds = guiMeshes.clouds.visible
    guiVisibilityParams.showAtmosphere = guiMeshes.atmosphere.visible
  }

  guiInstance.controllersRecursive().forEach(c => c.updateDisplay())
}

export function setupGui(planetUniforms: PlanetUniforms, atmosUniforms: AtmosphereUniforms, cloudUniforms: CloudUniforms, postUniforms: PostUniforms, meshes: MeshVisibility) {
  const gui = new GUI({ title: 'Planet Controls' })
  guiInstance = gui
  guiPlanetUniforms = planetUniforms
  guiAtmosUniforms = atmosUniforms
  guiCloudUniforms = cloudUniforms
  guiMeshes = meshes

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

  const cloudParams = {
    cloudScale: cloudUniforms.cloudScale.value,
    cloudDensity: cloudUniforms.cloudDensity.value,
    cloudSharpness: cloudUniforms.cloudSharpness.value,
    cloudOpacity: cloudUniforms.cloudOpacity.value,
    cloudColor: '#' + cloudUniforms.cloudColor.value.getHexString(),
  }
  guiParams = params
  guiCloudParams = cloudParams

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
    // Clouds
    cloudParams.cloudScale = 2.0 + Math.random() * 5.0
    cloudUniforms.cloudScale.value = cloudParams.cloudScale
    cloudParams.cloudDensity = 0.3 + Math.random() * 0.4
    cloudUniforms.cloudDensity.value = cloudParams.cloudDensity
    cloudParams.cloudSharpness = 1.5 + Math.random() * 6.0
    cloudUniforms.cloudSharpness.value = cloudParams.cloudSharpness
    cloudParams.cloudOpacity = 0.2 + Math.random() * 0.5
    cloudUniforms.cloudOpacity.value = cloudParams.cloudOpacity
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

  const visibilityParams = { showClouds: meshes.clouds.visible, showAtmosphere: meshes.atmosphere.visible }
  guiVisibilityParams = visibilityParams

  cloudFolder.add(visibilityParams, 'showClouds').name('Visible').onChange((v: boolean) => {
    meshes.clouds.visible = v
  })

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

  atmosFolder.add(visibilityParams, 'showAtmosphere').name('Visible').onChange((v: boolean) => {
    meshes.atmosphere.visible = v
  })

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

  postFolder.add({ enabled: postUniforms.postProcessingEnabled }, 'enabled').name('Enabled').onChange((v: boolean) => {
    postUniforms.togglePostProcessing(v)
  })

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
  const an = postUniforms.rawNodes.anamorphic
  anaFolder.add({ v: an.threshold.value }, 'v', 0.0, 2.0, 0.05).name('Threshold').onChange((v: number) => { an.threshold.value = v })
  anaFolder.add({ v: an.scale.value }, 'v', 0.5, 10.0, 0.1).name('Scale').onChange((v: number) => { an.scale.value = v })

  // DOF
  const dofFolder = postFolder.addFolder('Depth of Field')
  dofFolder.add({ enabled: postUniforms.effectToggles.dof }, 'enabled').name('Enabled').onChange((v: boolean) => {
    postUniforms.toggleEffect('dof', v)
  })
  const dp = postUniforms.rawNodes.dof
  dofFolder.add({ v: dp.focus.value }, 'v', 0.5, 20.0, 0.1).name('Focus Distance').onChange((v: number) => { dp.focus.value = v })
  dofFolder.add({ v: dp.aperture.value }, 'v', 0.0001, 0.01, 0.0001).name('Aperture').onChange((v: number) => { dp.aperture.value = v })
  dofFolder.add({ v: dp.maxblur.value }, 'v', 0.0, 0.05, 0.001).name('Max Blur').onChange((v: number) => { dp.maxblur.value = v })

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
