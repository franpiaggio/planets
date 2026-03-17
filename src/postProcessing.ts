// ---------------------------------------------------------------------------
// Post-processing pipeline — bloom, anamorphic, depth of field
// ---------------------------------------------------------------------------

import { PostProcessing } from 'three/webgpu'
import { pass, uniform, nodeObject } from 'three/tsl'
import BloomNode from 'three/addons/tsl/display/BloomNode.js'
import { anamorphic } from 'three/addons/tsl/display/AnamorphicNode.js'
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js'

export interface PostProcessingState {
  postProcessing: PostProcessing
  passes: Record<string, any>
  rawNodes: Record<string, any>
  dofFocusUniform: any
  dofApertureUniform: any
  dofMaxblurUniform: any
  enabled: boolean
  effectToggles: {
    bloom: boolean
    anamorphic: boolean
    dof: boolean
  }
}

export function createPostProcessing(
  renderer: any,
  scene: any,
  camera: any,
): PostProcessingState {
  const postProcessing = new PostProcessing(renderer)
  const scenePass = pass(scene, camera)

  const passes: Record<string, any> = {}
  const rawNodes: Record<string, any> = {}

  const scenePassColor = scenePass.getTextureNode('output')

  // Bloom — high threshold so only HDR stars (>1.5) bloom
  const bloomNode = new BloomNode(nodeObject(scenePassColor), 0.7, 0.5, 1.5)
  passes.bloom = nodeObject(bloomNode as any)
  rawNodes.bloom = bloomNode

  // Anamorphic
  const anaThreshold = uniform(0.9)
  const anaScale = uniform(3.0)
  passes.anamorphic = anamorphic(scenePassColor, anaThreshold, anaScale, 32)
  rawNodes.anamorphic = { threshold: anaThreshold, scale: anaScale }

  // Depth of field
  const scenePassViewZ = scenePass.getViewZNode()
  const dofFocusUniform = uniform(7.0)
  const dofApertureUniform = uniform(0.0008)
  const dofMaxblurUniform = uniform(0.003)
  passes.dof = dof(scenePassColor, scenePassViewZ, dofFocusUniform, dofApertureUniform, dofMaxblurUniform)
  rawNodes.dof = { focus: dofFocusUniform, aperture: dofApertureUniform, maxblur: dofMaxblurUniform }

  passes._scenePassColor = scenePassColor

  const effectToggles = {
    bloom: true,
    anamorphic: false,
    dof: true,
  }

  const state: PostProcessingState = {
    postProcessing,
    passes,
    rawNodes,
    dofFocusUniform,
    dofApertureUniform,
    dofMaxblurUniform,
    enabled: true,
    effectToggles,
  }

  buildPipeline(state)
  return state
}

export function buildPipeline(state: PostProcessingState) {
  const { passes, effectToggles, postProcessing } = state
  let result = passes._scenePassColor

  if (effectToggles.dof) result = passes.dof
  if (effectToggles.bloom) result = result.add(passes.bloom)
  if (effectToggles.anamorphic) result = result.add(passes.anamorphic)

  postProcessing.outputNode = result
  postProcessing.needsUpdate = true
}

export function toggleEffect(state: PostProcessingState, name: string, enabled: boolean) {
  (state.effectToggles as any)[name] = enabled
  buildPipeline(state)
}

export function togglePostProcessing(state: PostProcessingState, enabled: boolean) {
  state.enabled = enabled
}
