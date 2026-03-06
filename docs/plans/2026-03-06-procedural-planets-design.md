# Procedural Planets - Design Plan

## Goal
Generate hyper-realistic planets of all types (terrestrial, gas giants, ice, lava, etc.) 100% with code using procedural shaders. No textures initially — everything generated via TSL shaders.

## Stack
- React + Vite
- React Three Fiber (R3F)
- Three.js with WebGPU renderer + TSL (Three.js Shading Language)
- @react-three/drei (OrbitControls, helpers)

## Project Structure
```
planets/
├── src/
│   ├── App.jsx              — Layout, UI controls
│   ├── main.jsx             — Entry point
│   ├── components/
│   │   └── Planet.jsx       — Planet component
│   ├── shaders/
│   │   └── (reusable TSL functions)
│   └── lib/
│       └── noise.js         — Procedural noise functions
├── index.html
├── package.json
└── vite.config.js
```

## Phases

### Phase 1: Setup
- Vite + React project
- R3F with WebGPU renderer
- White sphere rotating with OrbitControls
- Verify WebGPU works in browser

### Phase 2: Procedural Color
- First TSL shader on the sphere
- Gradients, simple noise-based coloring
- Understand TSL basics: Fn(), nodes, method chaining

### Phase 3: Terrain
- Procedural noise (simplex/perlin) in TSL
- Vertex displacement for mountains/valleys
- Color mapping based on elevation (ocean, land, snow)

### Phase 4: Atmosphere
- Fresnel-based atmospheric glow
- Separate transparent sphere slightly larger than planet
- Twilight/day color blending

### Phase 5: Clouds
- Semi-transparent cloud layer
- Animated UV offset for movement
- Noise-based cloud patterns

### Phase 6: Lighting
- Directional sun light
- Day/night cycle
- Emissive city lights on night side

### Phase 7: Planet Types
- Parameterize shaders for different planet types:
  - Terrestrial (Earth-like, Mars-like)
  - Gas giants (banded atmosphere, storms)
  - Ice planets
  - Lava/volcanic planets
  - Desert worlds
- Seed-based generation for reproducibility

### Phase 8: UI Controls
- Parameter panel (leva or custom)
- Real-time adjustment of planet properties
- Planet type presets

### Phase 9: Extras
- Saturn-like rings
- Moons
- Starfield background
- Post-processing (bloom, tone mapping)
