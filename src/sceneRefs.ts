// ---------------------------------------------------------------------------
// Shared scene references — typed interface for cross-module access
// ---------------------------------------------------------------------------

import type { Mesh, Group, DirectionalLight, AmbientLight, Points } from 'three/webgpu'
import type { PostProcessingState } from './postProcessing'
import type { createPlanetMaterial } from './shaders/planet'
import type { createCloudMaterial } from './shaders/clouds'
import type { createAtmosphereMaterial } from './shaders/atmosphere'
import type { createRingMaterial } from './shaders/rings'

export interface SceneRefs {
  planet: Mesh
  clouds: Mesh
  atmosphere: Mesh
  rings: Mesh
  planetGroup: Group
  sun: DirectionalLight
  sunFlare: any
  planetUniforms: ReturnType<typeof createPlanetMaterial>['uniforms']
  planetMaterials: Record<number, any>
  cloudUniforms: ReturnType<typeof createCloudMaterial>['uniforms']
  atmosUniforms: ReturnType<typeof createAtmosphereMaterial>['uniforms']
  ringUniforms: ReturnType<typeof createRingMaterial>['uniforms']
  starfield: Points
  ambientLight: AmbientLight
  pp: PostProcessingState
}
