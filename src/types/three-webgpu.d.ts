declare const __DEV__: boolean

declare module '*.png?url' {
  const src: string
  export default src
}

// ---------------------------------------------------------------------------
// Three.js WebGPU re-exports
// ---------------------------------------------------------------------------

declare module 'three/webgpu' {
  import * as THREE from 'three'

  export {
    Scene, PerspectiveCamera, Color, Vector3, Vector2,
    SphereGeometry, BufferGeometry, PlaneGeometry, BoxGeometry, RingGeometry,
    Mesh, Points, Group, Object3D, Material, Sprite,
    BackSide, FrontSide, DoubleSide, AdditiveBlending,
    RepeatWrapping, ClampToEdgeWrapping, SRGBColorSpace,
    Float32BufferAttribute, BufferAttribute,
    AmbientLight, DirectionalLight, PointLight,
    TextureLoader, Clock,
  } from 'three'

  export class WebGPURenderer {
    constructor(options?: { antialias?: boolean; canvas?: HTMLCanvasElement })
    domElement: HTMLCanvasElement
    toneMapping: number
    toneMappingExposure: number
    init(): Promise<void>
    render(scene: THREE.Scene, camera: THREE.Camera): void
    setSize(width: number, height: number): void
    setPixelRatio(ratio: number): void
    setAnimationLoop(callback: (() => void) | null): void
  }

  export class PostProcessing {
    constructor(renderer: WebGPURenderer)
    outputNode: any
    needsUpdate: boolean
    render(): void
  }

  export class MeshBasicNodeMaterial extends THREE.Material {
    colorNode: any
    opacityNode: any
    map: THREE.Texture | null
    transparent: boolean
    depthWrite: boolean
    depthTest: boolean
    fog: boolean
    side: THREE.Side
    blending: THREE.Blending
  }

  export class MeshStandardNodeMaterial extends THREE.Material {
    colorNode: any
    roughnessNode: any
    metalnessNode: any
    normalNode: any
    emissiveNode: any
    opacityNode: any
    positionNode: any
    transparent: boolean
    depthWrite: boolean
    side: THREE.Side
  }

  export class PointsNodeMaterial extends THREE.Material {
    colorNode: any
    sizeNode: any
    sizeAttenuation: boolean
    vertexColors: boolean
  }

  export class SpriteNodeMaterial extends THREE.Material {
    colorNode: any
    opacityNode: any
  }
}

// ---------------------------------------------------------------------------
// TSL post-processing nodes
// ---------------------------------------------------------------------------

declare module 'three/addons/tsl/display/BloomNode.js' {
  export default class BloomNode {
    constructor(inputNode: any, strength?: number, radius?: number, threshold?: number)
    strength: { value: number }
    radius: { value: number }
    threshold: { value: number }
  }
}

declare module 'three/addons/tsl/display/LensflareNode.js' {
  export function lensflare(node: any, params?: any): any
}

declare module 'three/addons/tsl/display/GaussianBlurNode.js' {
  export function gaussianBlur(node: any, sigma?: number): any
}

declare module 'three/addons/tsl/display/AnamorphicNode.js' {
  export function anamorphic(node: any, threshold?: any, scale?: any, samples?: number): any
}

declare module 'three/addons/tsl/display/DepthOfFieldNode.js' {
  export function dof(node: any, viewZNode: any, focus?: any, aperture?: any, maxblur?: any): any
}

declare module 'three/addons/tsl/display/GTAONode.js' {
  export function ao(depthNode: any, normalNode: any, camera: any): any
}

declare module 'three/addons/tsl/display/SSRNode.js' {
  export function ssr(colorNode: any, depthNode: any, normalNode: any, metalnessNode: any, camera: any): any
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

declare module 'three/addons/controls/OrbitControls.js' {
  import { Camera, EventDispatcher } from 'three'

  export class OrbitControls extends EventDispatcher {
    constructor(camera: Camera, domElement: HTMLElement)
    enableDamping: boolean
    dampingFactor: number
    enablePan: boolean
    rotateSpeed: number
    zoomSpeed: number
    minDistance: number
    maxDistance: number
    update(): void
    dispose(): void
  }
}

