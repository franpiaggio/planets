declare module 'three/webgpu' {
  import * as THREE from 'three'

  export {
    Scene, PerspectiveCamera, Color, Vector3, Vector2,
    SphereGeometry, BufferGeometry, PlaneGeometry, BoxGeometry,
    Mesh, Points, Group, Object3D, Material,
    BackSide, FrontSide, DoubleSide,
    RepeatWrapping, ClampToEdgeWrapping, SRGBColorSpace,
    Float32BufferAttribute, BufferAttribute,
    AmbientLight, DirectionalLight, PointLight,
    TextureLoader, Clock,
  } from 'three'

  export class WebGPURenderer {
    constructor(options?: { antialias?: boolean; canvas?: HTMLCanvasElement })
    domElement: HTMLCanvasElement
    init(): Promise<void>
    render(scene: THREE.Scene, camera: THREE.Camera): void
    setSize(width: number, height: number): void
    setPixelRatio(ratio: number): void
    setAnimationLoop(callback: (() => void) | null): void
  }

  export class MeshBasicNodeMaterial extends THREE.Material {
    colorNode: any
    opacityNode: any
    transparent: boolean
    depthWrite: boolean
    side: THREE.Side
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
    vertexColors: boolean
  }
}

declare module 'three/addons/controls/OrbitControls.js' {
  import { Camera, EventDispatcher } from 'three'

  export class OrbitControls extends EventDispatcher {
    constructor(camera: Camera, domElement: HTMLElement)
    enableDamping: boolean
    dampingFactor: number
    minDistance: number
    maxDistance: number
    update(): void
    dispose(): void
  }
}
