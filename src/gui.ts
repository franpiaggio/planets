import GUI from 'lil-gui'
import type { Vector3 } from 'three'

interface PlanetUniforms {
  noiseType: { value: number }
  noiseScale: { value: number }
  lacunarity: { value: number }
  gain: { value: number }
  sunDirection: { value: Vector3 }
}

const NOISE_TYPES: Record<string, number> = {
  'Value': 0,
  'Gradient (Perlin)': 1,
  'Simplex': 2,
  'Voronoi': 3,
  'Ridged': 4,
}

export function setupGui(uniforms: PlanetUniforms) {
  const gui = new GUI({ title: 'Planet Controls' })

  const params = {
    noiseType: 'Gradient (Perlin)',
    noiseScale: uniforms.noiseScale.value,
    lacunarity: uniforms.lacunarity.value,
    gain: uniforms.gain.value,
  }

  const noiseFolder = gui.addFolder('Noise')

  noiseFolder.add(params, 'noiseType', Object.keys(NOISE_TYPES)).name('Type').onChange((v: string) => {
    uniforms.noiseType.value = NOISE_TYPES[v]
  })

  noiseFolder.add(params, 'noiseScale', 0.5, 10, 0.1).name('Scale').onChange((v: number) => {
    uniforms.noiseScale.value = v
  })

  noiseFolder.add(params, 'lacunarity', 1.0, 4.0, 0.1).name('Lacunarity').onChange((v: number) => {
    uniforms.lacunarity.value = v
  })

  noiseFolder.add(params, 'gain', 0.1, 0.9, 0.05).name('Gain').onChange((v: number) => {
    uniforms.gain.value = v
  })

  noiseFolder.open()
}
