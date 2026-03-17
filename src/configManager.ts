// ---------------------------------------------------------------------------
// Config read / apply — exact planet reproduction from snapshots
// ---------------------------------------------------------------------------

import { Vector3 } from 'three/webgpu'
import type { PlanetConfig } from './planetConfig'
import type { SceneRefs } from './sceneRefs'
import { refreshGui } from './gui'

export function readConfig(refs: SceneRefs): PlanetConfig {
  const p = refs.planetUniforms
  const c = refs.cloudUniforms
  const a = refs.atmosUniforms
  const r = refs.ringUniforms

  return {
    category: p.planetCategory.value,
    seed: { x: p.seed.value.x, y: p.seed.value.y, z: p.seed.value.z },
    terrain: {
      noiseScale: p.noiseScale.value,
      lacunarity: p.lacunarity.value,
      gain: p.gain.value,
      terrainHeight: p.terrainHeight.value,
      seaLevel: p.seaLevel.value,
      warpStrength: p.warpStrength.value,
      ridgeStrength: p.ridgeStrength.value,
      erosionStrength: p.erosionStrength.value,
      terrainPower: p.terrainPower.value,
      moistureScale: p.moistureScale.value,
      moistureOffset: { x: p.moistureOffset.value.x, y: p.moistureOffset.value.y, z: p.moistureOffset.value.z },
      bumpStrength: p.bumpStrength.value,
      worleyBlend: p.worleyBlend.value,
    },
    biome: {
      deepOcean: p.deepOcean.value.getHex(),
      midOcean: p.midOcean.value.getHex(),
      shallowWater: p.shallowWater.value.getHex(),
      coast: p.coast.value.getHex(),
      sand: p.sand.value.getHex(),
      sand2: p.sand2.value.getHex(),
      savanna: p.savanna.value.getHex(),
      savanna2: p.savanna2.value.getHex(),
      grass: p.grass.value.getHex(),
      grass2: p.grass2.value.getHex(),
      forest: p.forest.value.getHex(),
      forest2: p.forest2.value.getHex(),
      rock: p.rock.value.getHex(),
      rock2: p.rock2.value.getHex(),
      snow: p.snow.value.getHex(),
      snowDirty: p.snowDirty.value.getHex(),
    },
    clouds: {
      visible: refs.clouds.visible,
      scale: c.cloudScale.value,
      density: c.cloudDensity.value,
      sharpness: c.cloudSharpness.value,
      opacity: c.cloudOpacity.value,
      color: c.cloudColor.value.getHex(),
    },
    atmosphere: {
      visible: refs.atmosphere.visible,
      color: a.atmosphereColor.value.getHex(),
      twilightColor: a.twilightColor.value.getHex(),
      glowIntensity: a.glowIntensity.value,
      glowCoefficient: a.glowCoefficient.value,
      glowPower: a.glowPower.value,
    },
    rings: {
      visible: refs.rings.visible,
      colors: [r.ringColor1.value.getHex(), r.ringColor2.value.getHex(), r.ringColor3.value.getHex()],
      opacity: r.ringOpacity.value,
      bandFreq: r.bandFreq.value,
      bandFreq2: r.bandFreq2.value,
      gaps: [
        r.gapPos1.value, r.gapWidth1.value,
        r.gapPos2.value, r.gapWidth2.value,
        r.gapPos3.value, r.gapWidth3.value,
      ],
      innerTrim: r.innerTrim.value,
      outerTrim: r.outerTrim.value,
      densityVar: r.densityVar.value,
      rotationX: refs.rings.rotation.x,
    },
    transform: {
      scale: { x: refs.planetGroup.scale.x, y: refs.planetGroup.scale.y, z: refs.planetGroup.scale.z },
      axialTilt: refs.planetGroup.rotation.z,
    },
    lighting: {
      sunDirection: { x: p.sunDirection.value.x, y: p.sunDirection.value.y, z: p.sunDirection.value.z },
    },
  }
}

export function applyConfig(refs: SceneRefs, cfg: PlanetConfig) {
  const p = refs.planetUniforms
  const c = refs.cloudUniforms
  const a = refs.atmosUniforms
  const r = refs.ringUniforms

  // Category & seed
  p.planetCategory.value = cfg.category
  p.seed.value.set(cfg.seed.x, cfg.seed.y, cfg.seed.z)

  // Terrain
  p.noiseScale.value = cfg.terrain.noiseScale
  p.lacunarity.value = cfg.terrain.lacunarity
  p.gain.value = cfg.terrain.gain
  p.terrainHeight.value = cfg.terrain.terrainHeight
  p.seaLevel.value = cfg.terrain.seaLevel
  p.warpStrength.value = cfg.terrain.warpStrength
  p.ridgeStrength.value = cfg.terrain.ridgeStrength
  p.erosionStrength.value = cfg.terrain.erosionStrength
  p.terrainPower.value = cfg.terrain.terrainPower
  p.moistureScale.value = cfg.terrain.moistureScale
  p.moistureOffset.value.set(cfg.terrain.moistureOffset.x, cfg.terrain.moistureOffset.y, cfg.terrain.moistureOffset.z)
  p.bumpStrength.value = cfg.terrain.bumpStrength
  p.worleyBlend.value = cfg.terrain.worleyBlend

  // Biome colors
  const biomeKeys = [
    'deepOcean', 'midOcean', 'shallowWater', 'coast',
    'sand', 'sand2', 'savanna', 'savanna2',
    'grass', 'grass2', 'forest', 'forest2',
    'rock', 'rock2', 'snow', 'snowDirty',
  ] as const
  for (const key of biomeKeys) {
    (p as any)[key].value.set(cfg.biome[key])
  }

  // Clouds
  refs.clouds.visible = cfg.clouds.visible
  c.cloudScale.value = cfg.clouds.scale
  c.cloudDensity.value = cfg.clouds.density
  c.cloudSharpness.value = cfg.clouds.sharpness
  c.cloudOpacity.value = cfg.clouds.opacity
  c.cloudColor.value.set(cfg.clouds.color)

  // Atmosphere
  refs.atmosphere.visible = cfg.atmosphere.visible
  a.atmosphereColor.value.set(cfg.atmosphere.color)
  a.twilightColor.value.set(cfg.atmosphere.twilightColor)
  a.glowIntensity.value = cfg.atmosphere.glowIntensity
  a.glowCoefficient.value = cfg.atmosphere.glowCoefficient
  a.glowPower.value = cfg.atmosphere.glowPower

  // Rings
  refs.rings.visible = cfg.rings.visible
  r.ringColor1.value.set(cfg.rings.colors[0])
  r.ringColor2.value.set(cfg.rings.colors[1])
  r.ringColor3.value.set(cfg.rings.colors[2])
  r.ringOpacity.value = cfg.rings.opacity
  r.bandFreq.value = cfg.rings.bandFreq
  r.bandFreq2.value = cfg.rings.bandFreq2
  r.gapPos1.value = cfg.rings.gaps[0]
  r.gapWidth1.value = cfg.rings.gaps[1]
  r.gapPos2.value = cfg.rings.gaps[2]
  r.gapWidth2.value = cfg.rings.gaps[3]
  r.gapPos3.value = cfg.rings.gaps[4]
  r.gapWidth3.value = cfg.rings.gaps[5]
  r.innerTrim.value = cfg.rings.innerTrim
  r.outerTrim.value = cfg.rings.outerTrim
  r.densityVar.value = cfg.rings.densityVar
  refs.rings.rotation.x = cfg.rings.rotationX

  // Transform
  refs.planetGroup.scale.set(cfg.transform.scale.x, cfg.transform.scale.y, cfg.transform.scale.z)
  refs.planetGroup.rotation.x = 0
  refs.planetGroup.rotation.z = cfg.transform.axialTilt

  // Lighting
  const sunDir = new Vector3(cfg.lighting.sunDirection.x, cfg.lighting.sunDirection.y, cfg.lighting.sunDirection.z)
  p.sunDirection.value.copy(sunDir).normalize()
  refs.sun.position.copy(sunDir.normalize().multiplyScalar(5))
  refs.sunFlare.position.copy(p.sunDirection.value).multiplyScalar(50)
  refreshGui()
}
