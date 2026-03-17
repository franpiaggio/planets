// ---------------------------------------------------------------------------
// Showcase — step-by-step planet construction presentation
// Activated via ?showcase URL parameter
// ---------------------------------------------------------------------------

import { MeshBasicNodeMaterial, Color } from 'three/webgpu'
import { togglePostProcessing } from './postProcessing'
import type { SceneRefs } from './sceneRefs'

const STEPS = [
  { name: 'Sphere', label: 'Basic geometry — 96×96 subdivisions' },
  { name: 'Stars', label: 'Starfield background' },
  { name: 'Base Noise', label: 'FBM Perlin noise → flat color bands' },
  { name: 'Domain Warping', label: 'Distort coordinates for organic shapes' },
  { name: 'Displacement', label: 'Noise drives vertex height' },
  { name: 'Sea Level', label: 'Ocean fills low elevations' },
  { name: 'Ridges', label: 'Ridged multifractal for mountain peaks' },
  { name: 'Erosion', label: 'Derivative-based erosion in valleys' },
  { name: 'Surface Detail', label: 'Worley texture + bump normals' },
  { name: 'Atmosphere', label: 'Fresnel glow + inner light scattering' },
  { name: 'Clouds', label: 'Procedural cloud layer with FBM' },
  { name: 'Rings', label: 'Planetary ring system' },
  { name: 'Post-processing', label: 'Bloom + tone mapping' },
  { name: 'Final', label: 'Complete planet' },
]

let currentStep = 0
let refs: SceneRefs
let snapshot: {
  terrainHeight: number
  seaLevel: number
  warpStrength: number
  ridgeStrength: number
  erosionStrength: number
  worleyBlend: number
  bumpStrength: number
  realMaterial: any
}

const wireframeMat = new MeshBasicNodeMaterial()
;(wireframeMat as any).color = new Color(0x444444)
;(wireframeMat as any).wireframe = true

// ---------------------------------------------------------------------------
// Apply cumulative state up to step N (1-indexed)
// ---------------------------------------------------------------------------

function applyStep(step: number) {
  // Reset everything to baseline
  refs.starfield.visible = false
  refs.sun.visible = false
  refs.sunFlare.visible = false
  refs.ambientLight.intensity = 0.08
  refs.atmosphere.visible = false
  refs.clouds.visible = false
  refs.rings.visible = false
  refs.planet.material = wireframeMat
  refs.planetUniforms.terrainHeight.value = 0
  refs.planetUniforms.warpStrength.value = 0
  refs.planetUniforms.seaLevel.value = 0
  refs.planetUniforms.ridgeStrength.value = 0
  refs.planetUniforms.erosionStrength.value = 0
  refs.planetUniforms.worleyBlend.value = 0
  refs.planetUniforms.bumpStrength.value = 0
  togglePostProcessing(refs.pp, false)

  // 1: Sphere — wireframe with minimal ambient
  // (already set above)

  // 2: Stars
  if (step >= 2) {
    refs.starfield.visible = true
  }

  // 3: Base Noise — light on + real material, flat, no warp
  if (step >= 3) {
    refs.sun.visible = true
    refs.sunFlare.visible = true
    refs.ambientLight.intensity = 0.3
    refs.planet.material = snapshot.realMaterial
  }

  // 4: Domain Warping — shapes become organic
  if (step >= 4) {
    refs.planetUniforms.warpStrength.value = snapshot.warpStrength
  }

  // 5: Displacement — terrain pops out
  if (step >= 5) {
    refs.planetUniforms.terrainHeight.value = snapshot.terrainHeight
  }

  // 6: Sea Level — ocean fills valleys
  if (step >= 6) {
    refs.planetUniforms.seaLevel.value = snapshot.seaLevel
  }

  // 7: Ridges — sharp mountain peaks
  if (step >= 7) {
    refs.planetUniforms.ridgeStrength.value = snapshot.ridgeStrength
  }

  // 8: Erosion — natural weathering in valleys
  if (step >= 8) {
    refs.planetUniforms.erosionStrength.value = snapshot.erosionStrength
  }

  // 9: Surface Detail — worley texture + bump normals
  if (step >= 9) {
    refs.planetUniforms.worleyBlend.value = snapshot.worleyBlend
    refs.planetUniforms.bumpStrength.value = snapshot.bumpStrength
  }

  // 10: Atmosphere
  if (step >= 10) {
    refs.atmosphere.visible = true
  }

  // 11: Clouds
  if (step >= 11) {
    refs.clouds.visible = true
  }

  // 12: Rings
  if (step >= 12) {
    refs.rings.visible = true
  }

  // 13: Post-processing
  if (step >= 13) {
    togglePostProcessing(refs.pp, true)
  }

  // 14: Final — everything active

  updateUI()
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

let dotsContainer: HTMLElement
let labelEl: HTMLElement
let stepCountEl: HTMLElement

function createUI() {
  const bar = document.createElement('div')
  bar.className = 'showcase-bar'

  // Step counter
  stepCountEl = document.createElement('div')
  stepCountEl.className = 'showcase-count'

  // Dots
  dotsContainer = document.createElement('div')
  dotsContainer.className = 'showcase-dots'
  for (let i = 0; i < STEPS.length; i++) {
    const dot = document.createElement('div')
    dot.className = 'showcase-dot'
    dot.addEventListener('click', () => {
      currentStep = i + 1
      applyStep(currentStep)
    })
    dotsContainer.appendChild(dot)
  }

  // Label
  labelEl = document.createElement('div')
  labelEl.className = 'showcase-label'

  // Hint
  const hint = document.createElement('div')
  hint.className = 'showcase-hint'
  hint.textContent = '← → arrow keys'

  bar.appendChild(stepCountEl)
  bar.appendChild(dotsContainer)
  bar.appendChild(labelEl)
  bar.appendChild(hint)
  document.body.appendChild(bar)

  // Inject styles
  const style = document.createElement('style')
  style.textContent = `
    .showcase-bar {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      z-index: 100;
      padding: 16px 28px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(12px);
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .showcase-count {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
      font-family: system-ui, sans-serif;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .showcase-dots {
      display: flex;
      gap: 8px;
    }
    .showcase-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      cursor: pointer;
      transition: background 0.3s, transform 0.3s;
    }
    .showcase-dot:hover {
      background: rgba(255, 255, 255, 0.4);
    }
    .showcase-dot.past {
      background: rgba(255, 255, 255, 0.35);
    }
    .showcase-dot.active {
      background: #fff;
      transform: scale(1.3);
    }
    .showcase-label {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.85);
      font-family: system-ui, sans-serif;
      font-weight: 600;
      text-align: center;
      min-height: 20px;
    }
    .showcase-hint {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.25);
      font-family: system-ui, sans-serif;
    }
  `
  document.head.appendChild(style)
}

function updateUI() {
  const dots = dotsContainer.children
  for (let i = 0; i < dots.length; i++) {
    const dot = dots[i] as HTMLElement
    dot.className = 'showcase-dot'
    if (i + 1 < currentStep) dot.classList.add('past')
    if (i + 1 === currentStep) dot.classList.add('active')
  }

  if (currentStep === 0) {
    labelEl.textContent = ''
    stepCountEl.textContent = ''
  } else {
    const step = STEPS[currentStep - 1]
    labelEl.textContent = `${step.name} — ${step.label}`
    stepCountEl.textContent = `${currentStep} / ${STEPS.length}`
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initShowcase(sceneRefs: SceneRefs) {
  refs = sceneRefs

  // Force clouds and rings visible for showcase
  refs.clouds.visible = true
  refs.rings.visible = true

  // Force a balanced sea level so both land and water are visible
  refs.planetUniforms.seaLevel.value = Math.min(refs.planetUniforms.seaLevel.value, 0.35)

  // Snapshot current planet state before we start modifying
  snapshot = {
    terrainHeight: refs.planetUniforms.terrainHeight.value,
    seaLevel: refs.planetUniforms.seaLevel.value,
    warpStrength: refs.planetUniforms.warpStrength.value,
    ridgeStrength: refs.planetUniforms.ridgeStrength.value,
    erosionStrength: refs.planetUniforms.erosionStrength.value,
    worleyBlend: refs.planetUniforms.worleyBlend.value,
    bumpStrength: refs.planetUniforms.bumpStrength.value,
    realMaterial: refs.planet.material,
  }

  // Create UI
  createUI()

  // Start at step 1
  currentStep = 1
  applyStep(currentStep)

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault()
      if (currentStep < STEPS.length) {
        currentStep++
        applyStep(currentStep)
      }
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (currentStep > 1) {
        currentStep--
        applyStep(currentStep)
      }
    }
  })
}
