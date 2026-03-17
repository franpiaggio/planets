import GUI from 'lil-gui'
import type { Vector3, Color } from 'three'
import { GUI_LIMITS as L } from './ranges'
import { CATEGORY_ROCKY, CATEGORY_GAS, CATEGORY_LIQUID } from './shaders/planet'

interface PlanetUniforms {
  planetCategory: { value: number }
  noiseScale: { value: number }
  lacunarity: { value: number }
  gain: { value: number }
  terrainHeight: { value: number }
  seaLevel: { value: number }
  warpStrength: { value: number }
  ridgeStrength: { value: number }
  erosionStrength: { value: number }
  terrainPower: { value: number }
  moistureScale: { value: number }
  bumpStrength: { value: number }
  worleyBlend: { value: number }
  sunDirection: { value: Vector3 }
  seed: { value: Vector3 }
  [key: string]: { value: any }
}

interface BiomeUniforms {
  deepOcean: { value: Color }
  midOcean: { value: Color }
  shallowWater: { value: Color }
  coast: { value: Color }
  sand: { value: Color }
  sand2: { value: Color }
  savanna: { value: Color }
  savanna2: { value: Color }
  grass: { value: Color }
  grass2: { value: Color }
  forest: { value: Color }
  forest2: { value: Color }
  rock: { value: Color }
  rock2: { value: Color }
  snow: { value: Color }
  snowDirty: { value: Color }
  [key: string]: { value: Color }
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
let guiBiomeParams: Record<string, string> | null = null
let guiPlanetUniforms: PlanetUniforms | null = null
let guiAtmosUniforms: AtmosphereUniforms | null = null
let guiCloudUniforms: CloudUniforms | null = null
let guiBiomeUniforms: BiomeUniforms | null = null
let guiMeshes: MeshVisibility | null = null

// Controller/folder references for category-based visibility
let terrainFolder: GUI | null = null
let cloudFolder: GUI | null = null
let controllers: Record<string, any> = {}

const BIOME_KEYS = [
  'deepOcean', 'midOcean', 'shallowWater', 'coast',
  'sand', 'sand2', 'savanna', 'savanna2',
  'grass', 'grass2', 'forest', 'forest2',
  'rock', 'rock2', 'snow', 'snowDirty',
] as const

// Which terrain params each category uses
const CATEGORY_PARAMS: Record<number, Set<string>> = {
  [CATEGORY_ROCKY]:   new Set(['terrainHeight', 'seaLevel', 'warpStrength', 'ridgeStrength', 'erosionStrength', 'terrainPower', 'moistureScale', 'bumpStrength', 'worleyBlend']),
  [CATEGORY_GAS]:     new Set(['warpStrength']),
  [CATEGORY_LIQUID]:  new Set(['warpStrength']),
}

// Which categories show clouds folder
const CLOUD_CATEGORIES = new Set([CATEGORY_ROCKY, CATEGORY_LIQUID])

function updateVisibility(category: number) {
  const allowed = CATEGORY_PARAMS[category] || CATEGORY_PARAMS[CATEGORY_ROCKY]

  // Show/hide individual terrain controllers
  const terrainKeys = ['terrainHeight', 'seaLevel', 'warpStrength', 'ridgeStrength', 'erosionStrength', 'terrainPower', 'moistureScale', 'bumpStrength', 'worleyBlend']
  for (const key of terrainKeys) {
    if (controllers[key]) {
      if (allowed.has(key)) controllers[key].show()
      else controllers[key].hide()
    }
  }

  // Show/hide clouds folder
  if (cloudFolder) {
    if (CLOUD_CATEGORIES.has(category)) cloudFolder.show()
    else cloudFolder.hide()
  }
}

export function refreshGui() {
  if (!guiInstance || !guiParams || !guiPlanetUniforms || !guiAtmosUniforms || !guiCloudUniforms) return

  const p = guiPlanetUniforms
  guiParams.noiseScale = p.noiseScale.value
  guiParams.lacunarity = p.lacunarity.value
  guiParams.gain = p.gain.value
  guiParams.terrainHeight = p.terrainHeight.value
  guiParams.seaLevel = p.seaLevel.value
  guiParams.warpStrength = p.warpStrength.value
  guiParams.ridgeStrength = p.ridgeStrength.value
  guiParams.erosionStrength = p.erosionStrength.value
  guiParams.terrainPower = p.terrainPower.value
  guiParams.moistureScale = p.moistureScale.value
  guiParams.bumpStrength = p.bumpStrength.value
  guiParams.worleyBlend = p.worleyBlend.value
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

  if (guiBiomeParams && guiBiomeUniforms) {
    for (const key of BIOME_KEYS) {
      guiBiomeParams[key] = '#' + guiBiomeUniforms[key].value.getHexString()
    }
  }

  if (guiVisibilityParams && guiMeshes) {
    guiVisibilityParams.showClouds = guiMeshes.clouds.visible
    guiVisibilityParams.showAtmosphere = guiMeshes.atmosphere.visible
  }

  // Update visibility based on current category
  updateVisibility(p.planetCategory.value)

  guiInstance.controllersRecursive().forEach(c => c.updateDisplay())
}

export function setupGui(planetUniforms: PlanetUniforms, atmosUniforms: AtmosphereUniforms, cloudUniforms: CloudUniforms, biomeUniforms: BiomeUniforms, postUniforms: PostUniforms, meshes: MeshVisibility, onRandomize: () => void): GUI {
  const gui = new GUI({ title: 'Planet Controls' })
  guiInstance = gui
  guiPlanetUniforms = planetUniforms
  guiAtmosUniforms = atmosUniforms
  guiCloudUniforms = cloudUniforms
  guiBiomeUniforms = biomeUniforms
  guiMeshes = meshes

  const params = {
    noiseScale: planetUniforms.noiseScale.value,
    lacunarity: planetUniforms.lacunarity.value,
    gain: planetUniforms.gain.value,
    terrainHeight: planetUniforms.terrainHeight.value,
    seaLevel: planetUniforms.seaLevel.value,
    warpStrength: planetUniforms.warpStrength.value,
    ridgeStrength: planetUniforms.ridgeStrength.value,
    erosionStrength: planetUniforms.erosionStrength.value,
    terrainPower: planetUniforms.terrainPower.value,
    moistureScale: planetUniforms.moistureScale.value,
    bumpStrength: planetUniforms.bumpStrength.value,
    worleyBlend: planetUniforms.worleyBlend.value,
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

  gui.add({ randomize: onRandomize }, 'randomize').name('🎲 Randomize Planet')

  // Noise (always visible — shared by all)
  const noiseFolder = gui.addFolder('Noise')

  noiseFolder.add(params, 'noiseScale', L.noiseScale.min, L.noiseScale.max, 0.1).name('Scale').onChange((v: number) => {
    planetUniforms.noiseScale.value = v
  })

  noiseFolder.add(params, 'lacunarity', L.lacunarity.min, L.lacunarity.max, 0.1).name('Lacunarity').onChange((v: number) => {
    planetUniforms.lacunarity.value = v
  })

  noiseFolder.add(params, 'gain', L.gain.min, L.gain.max, 0.05).name('Gain').onChange((v: number) => {
    planetUniforms.gain.value = v
  })

  noiseFolder.open()

  // Terrain (controllers individually shown/hidden per category)
  terrainFolder = gui.addFolder('Terrain')

  controllers.terrainHeight = terrainFolder.add(params, 'terrainHeight', L.terrainHeight.min, L.terrainHeight.max, 0.01).name('Height').onChange((v: number) => {
    planetUniforms.terrainHeight.value = v
  })

  controllers.seaLevel = terrainFolder.add(params, 'seaLevel', L.seaLevel.min, L.seaLevel.max, 0.01).name('Sea Level').onChange((v: number) => {
    planetUniforms.seaLevel.value = v
  })

  controllers.warpStrength = terrainFolder.add(params, 'warpStrength', L.warpStrength.min, L.warpStrength.max, 0.05).name('Warp').onChange((v: number) => {
    planetUniforms.warpStrength.value = v
  })

  controllers.ridgeStrength = terrainFolder.add(params, 'ridgeStrength', L.ridgeStrength.min, L.ridgeStrength.max, 0.01).name('Ridge Strength').onChange((v: number) => {
    planetUniforms.ridgeStrength.value = v
  })

  controllers.erosionStrength = terrainFolder.add(params, 'erosionStrength', L.erosionStrength.min, L.erosionStrength.max, 0.05).name('Erosion').onChange((v: number) => {
    planetUniforms.erosionStrength.value = v
  })

  controllers.terrainPower = terrainFolder.add(params, 'terrainPower', L.terrainPower.min, L.terrainPower.max, 0.1).name('Power').onChange((v: number) => {
    planetUniforms.terrainPower.value = v
  })

  controllers.moistureScale = terrainFolder.add(params, 'moistureScale', L.moistureScale.min, L.moistureScale.max, 0.1).name('Moisture').onChange((v: number) => {
    planetUniforms.moistureScale.value = v
  })

  controllers.bumpStrength = terrainFolder.add(params, 'bumpStrength', L.bumpStrength.min, L.bumpStrength.max, 0.05).name('Bump').onChange((v: number) => {
    planetUniforms.bumpStrength.value = v
  })

  controllers.worleyBlend = terrainFolder.add(params, 'worleyBlend', L.worleyBlend.min, L.worleyBlend.max, 0.05).name('Worley').onChange((v: number) => {
    planetUniforms.worleyBlend.value = v
  })

  terrainFolder.open()

  // Biome Colors
  const colorFolder = gui.addFolder('Biome Colors')

  const biomeParams: Record<string, string> = {}
  for (const key of BIOME_KEYS) {
    biomeParams[key] = '#' + biomeUniforms[key].value.getHexString()
  }
  guiBiomeParams = biomeParams

  const biomeColorHelper = (folder: GUI, key: string, label: string) => {
    folder.addColor(biomeParams, key).name(label).onChange((v: string) => {
      biomeUniforms[key].value.set(v)
    })
  }

  const oceanSub = colorFolder.addFolder('Ocean')
  biomeColorHelper(oceanSub, 'deepOcean', 'Deep')
  biomeColorHelper(oceanSub, 'midOcean', 'Mid')
  biomeColorHelper(oceanSub, 'shallowWater', 'Shallow')
  biomeColorHelper(oceanSub, 'coast', 'Coast')

  const landSub = colorFolder.addFolder('Land')
  biomeColorHelper(landSub, 'sand', 'Sand')
  biomeColorHelper(landSub, 'sand2', 'Sand 2')
  biomeColorHelper(landSub, 'savanna', 'Savanna')
  biomeColorHelper(landSub, 'savanna2', 'Savanna 2')
  biomeColorHelper(landSub, 'grass', 'Grass')
  biomeColorHelper(landSub, 'grass2', 'Grass 2')
  biomeColorHelper(landSub, 'forest', 'Forest')
  biomeColorHelper(landSub, 'forest2', 'Forest 2')

  const peakSub = colorFolder.addFolder('Peaks')
  biomeColorHelper(peakSub, 'rock', 'Rock')
  biomeColorHelper(peakSub, 'rock2', 'Rock 2')
  biomeColorHelper(peakSub, 'snow', 'Snow')
  biomeColorHelper(peakSub, 'snowDirty', 'Snow Dirty')

  // Clouds (hidden for gas, lava)
  cloudFolder = gui.addFolder('Clouds')

  const visibilityParams = { showClouds: meshes.clouds.visible, showAtmosphere: meshes.atmosphere.visible }
  guiVisibilityParams = visibilityParams

  cloudFolder.add(visibilityParams, 'showClouds').name('Visible').onChange((v: boolean) => {
    meshes.clouds.visible = v
  })

  cloudFolder.add(cloudParams, 'cloudScale', L.cloudScale.min, L.cloudScale.max, 0.1).name('Scale').onChange((v: number) => {
    cloudUniforms.cloudScale.value = v
  })

  cloudFolder.add(cloudParams, 'cloudDensity', L.cloudDensity.min, L.cloudDensity.max, 0.01).name('Coverage').onChange((v: number) => {
    cloudUniforms.cloudDensity.value = v
  })

  cloudFolder.add(cloudParams, 'cloudSharpness', L.cloudSharpness.min, L.cloudSharpness.max, 0.1).name('Sharpness').onChange((v: number) => {
    cloudUniforms.cloudSharpness.value = v
  })

  cloudFolder.add(cloudParams, 'cloudOpacity', L.cloudOpacity.min, L.cloudOpacity.max, 0.05).name('Opacity').onChange((v: number) => {
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

  atmosFolder.add(params, 'glowIntensity', L.glowIntensity.min, L.glowIntensity.max, 0.05).name('Intensity').onChange((v: number) => {
    atmosUniforms.glowIntensity.value = v
  })

  atmosFolder.add(params, 'glowCoefficient', L.glowCoefficient.min, L.glowCoefficient.max, 0.05).name('Coefficient').onChange((v: number) => {
    atmosUniforms.glowCoefficient.value = v
  })

  atmosFolder.add(params, 'glowPower', L.glowPower.min, L.glowPower.max, 0.1).name('Power').onChange((v: number) => {
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

  postFolder.open()

  // Set initial visibility
  updateVisibility(planetUniforms.planetCategory.value)

  return gui
}
