# Plan: Terrain Realista para Planetas Procedurales

## Problema Actual
El terreno usa un FBM de 4 octavas con gradient noise custom + domain warping simple. Esto produce superficies "blobby" y dibujadas porque:
- El detalle se distribuye uniformemente (peaks y valleys tienen la misma rugosidad)
- No hay features afilados (todo son bumps redondeados)
- Solo 4 octavas = poco detalle fino
- Un solo tipo de noise = sin variedad estructural
- El coloring es puramente por elevacion = transiciones horizontales perfectas (poco realistas)

## Objetivo
Superficies planetarias que se vean geologicamente realistas: montanas con ridges afilados, valles planos, erosion visible, costas organicas, variedad entre tipos de planeta. Performante en WebGPU.

---

## Sesion 1: Migrar a MaterialX Noise + Ridged Multifractal

### Contexto
Three.js incluye noise de alta calidad via MaterialX (`mx_perlin_noise_float`, `mx_worley_noise_float`, etc.) con mejor hashing (Bob Jenkins) que nuestro custom `hash31`. Ademas, ridged noise es la mejora #1 para terreno realista.

### Tareas

**1.1 — Reemplazar noise custom por MaterialX**
- Archivo: `src/lib/noise.js`
- Importar `mx_perlin_noise_float` de `three/nodes/materialx/MaterialXNodes.js`
- Reemplazar `gradientNoise3D` internamente con `mx_perlin_noise_float` (mantener la API externa)
- Eliminar `simplexNoise3D` y `sampleNoise` (ya no necesitamos el selector, MaterialX Perlin es superior)
- Verificar que el planeta se ve igual o mejor con el nuevo noise base

**1.2 — Agregar Ridged Multifractal FBM**
- Archivo: `src/lib/noise.js`
- Nueva funcion `ridgedFbm(pos, octaves, lacunarity, gain)`
- Algoritmo: `weight = 1.0; signal = 1.0 - abs(noise * 2 - 1); signal *= signal; signal *= weight; weight = clamp(signal * gain)`
- Clave: cada octava depende de la anterior (heterogeneo) = detalle concentrado en ridges
- 6 octavas unrolled

**1.3 — Agregar FBM con derivadas (IQ Noise)**
- Archivo: `src/lib/noise.js`
- Nueva funcion `erosionFbm(pos, octaves, lacunarity, gain)`
- Usa derivadas analiticas del noise para suprimir detalle en slopes
- `value += amplitude * noise / (1 + dot(derivatives, derivatives))`
- Produce valles planos + peaks rugosos = aspecto de erosion natural
- Nota: `mx_perlin_noise_vec3` retorna 3 canales, podemos usar .x como valor y .yz como derivadas aproximadas, o calcular derivadas via central differences con el float

**1.4 — Integrar en planet.js**
- Archivo: `src/shaders/planet.js`
- Nuevo uniform `terrainType` (1=standard, 2=ridged, 3=erosion)
- `getElevation` selecciona el FBM segun `terrainType`
- Verificar visualmente con cada tipo

**1.5 — Actualizar GUI**
- Archivo: `src/gui.ts`
- Agregar selector de terrain type en la carpeta Noise
- Agregar control de octavas (aunque sea estetico, para futuro)

### Resultado esperado
Montanas con ridges afilados (tipo 2), terreno con aspecto erosionado (tipo 3). Mejora dramatica vs el blob actual.

---

## Sesion 2: Composicion Multi-escala + Worley Noise

### Contexto
El terreno real tiene estructura a multiples escalas: forma continental (baja freq), cadenas montanosas (media freq), detalle superficial (alta freq). Ademas, Worley/Voronoi agrega patrones celulares para craters, grietas, terrain rocoso.

### Tareas

**2.1 — Elevation multi-escala**
- Archivo: `src/shaders/planet.js`
- Separar `getElevation` en 3 capas:
  - `continentNoise`: FBM a baja frecuencia (scale * 0.5), 3 octavas — define continentes vs oceano
  - `mountainNoise`: ridgedFbm a media frecuencia (scale * 1.0), 5 octavas — cadenas montanosas
  - `detailNoise`: erosionFbm a alta frecuencia (scale * 4.0), 4 octavas, baja amplitud — textura fina
- Composicion: `elevation = continent + mountain * continentMask + detail * mountainMask`
- `continentMask` = smoothstep sobre continentNoise (montanas solo en tierra, no en oceano)
- `mountainMask` = smoothstep sobre mountainNoise (detalle fino solo en montanas altas)

**2.2 — Integrar Worley Noise**
- Archivo: `src/lib/noise.js`
- Importar `mx_worley_noise_float` de MaterialX
- Nueva funcion `craterNoise(pos, jitter)` — wrapper simple
- Nueva funcion `crackedNoise(pos)` — Worley distance-to-edge para grietas

**2.3 — Worley para detalle en terrain**
- Archivo: `src/shaders/planet.js`
- Agregar Worley como capa de detalle opcional:
  - En zonas de montanas altas: craterNoise para aspecto rocoso
  - Mezclado con Perlin via `mix(perlin, worley, blendFactor)`
- Uniform `worleyBlend` para controlar la intensidad

**2.4 — Power redistribution**
- Aplicar `pow(elevation, exponent)` para empujar elevaciones medias hacia abajo
- Crea valles mas planos y peaks mas pronunciados
- Nuevo uniform `terrainPower` (default 1.0, rango 0.5-3.0)

### Resultado esperado
Continentes definidos con costas organicas, montanas que solo aparecen en tierra firme, detalle fino concentrado en zonas altas. Aspecto geologico multi-escala.

---

## Sesion 3: Coloring Avanzado (Slope + Moisture + Detail)

### Contexto
El coloring actual es puramente por elevacion con bandas horizontales. Los planetas reales tienen color influenciado por pendiente (slopes empinados = roca), humedad (segundo campo de noise), y variacion local.

### Tareas

**3.1 — Slope-based coloring**
- Archivo: `src/shaders/planet.js`
- Calcular slope: `slope = 1.0 - dot(displacedNormal, originalNormal)` o via diferencias finitas en elevation
- Donde slope > threshold: forzar color roca independiente de la elevacion
- Transicion suave con smoothstep
- Esto solo ya agrega MUCHO realismo (acantilados rocosos, montanas con caras de roca)

**3.2 — Moisture como segundo campo de noise**
- Nuevo noise field independiente de elevation
- `moisture = fbm(pos * moistureScale + moistureOffset)`
- Combinar con elevation para biome lookup 2D:
  - Baja elevacion + alta humedad = selva/pantano
  - Baja elevacion + baja humedad = desierto/sabana
  - Alta elevacion + cualquier humedad = roca/nieve
- Nuevo uniform `moistureScale`, `moistureInfluence`

**3.3 — Noise-perturbed biome boundaries**
- Agregar noise a los thresholds de transicion entre biomas
- En vez de `smoothstep(0.4, 0.5, elevation)`, usar `smoothstep(0.4 + noise*0.03, 0.5 + noise*0.03, elevation)`
- Las fronteras entre biomas dejan de ser lineas horizontales perfectas

**3.4 — Color detail overlay**
- Agregar una capa de noise de alta frecuencia (scale * 8-16) que module ligeramente el color final
- Simula variacion de textura microscopica (tierra, arena, vegetacion)
- Amplitud muy baja (0.02-0.05) para no destruir los colores base

### Resultado esperado
Pendientes rocosas visibles, biomas que dependen de humedad + elevacion, fronteras organicas entre biomas, variacion de color a nivel micro.

---

## Sesion 4: Tipos de Planeta Especializados

### Contexto
Con el sistema de noise avanzado, podemos crear presets para diferentes tipos de planeta con configuraciones muy distintas.

### Tareas

**4.1 — Terrestrial (Earth-like)**
- El default mejorado de sesiones 1-3
- Multi-escala, ridged mountains, moisture biomes, clouds

**4.2 — Desert World (Mars-like)**
- Sin oceano (seaLevel muy bajo)
- Jordan/billowed turbulence para mesas y canones
- Worley overlay para terreno agrietado
- Paleta calida: rojos, naranjas, marrones
- Sin nubes o nubes muy tenues

**4.3 — Ice World**
- seaLevel alto, casi todo cubierto
- Voronoi cracking para patrones de glaciar
- Paleta fria: blancos, azules palidos, grises
- Nubes tenues

**4.4 — Lava/Volcanic**
- Worley distance-to-edge para grietas de lava
- Emissive color en las grietas (naranja/rojo brillante)
- Corteza oscura (negros, grises oscuros)
- Sin oceano — las zonas bajas son lava
- `emissiveNode` en el material basado en Worley

**4.5 — Gas Giant**
- Sin terrain displacement (esfera lisa)
- Bandas latitudinales: `noise(latitude * bandFreq)`
- Domain warping fuerte para turbulencia en las bandas
- Storms: Worley noise en puntos especificos
- Paleta variable (Jupiter=naranja/marron, Neptune=azul)

**4.6 — Sistema de presets**
- Archivo: `src/presets.ts`
- Cada preset define: terrainType, scales, octaves, colores, seaLevel, worleyBlend, moistureInfluence, etc.
- `randomizePlanet` elige un preset y randomiza dentro de sus rangos
- GUI permite seleccionar preset manualmente

### Resultado esperado
Variedad dramatica al hacer click en Randomize. Cada tipo de planeta tiene su caracter visual unico.

---

## Sesion 5: Performance + Polish

### Contexto
Con mas octavas y capas de noise, necesitamos asegurar buen framerate. Ademas, pulir detalles visuales.

### Tareas

**5.1 — Bake noise a textura (opcional)**
- Si el performance es problema: computar elevation en un compute shader y guardar en textura float R32F
- Solo recomputar cuando cambian parametros, no cada frame
- El fragment shader samplea la textura en vez de evaluar noise

**5.2 — LOD-aware octaves**
- Reducir octavas para planetas lejanos (si implementamos sistema multi-planeta)
- Por ahora: asegurar que 6 octavas corren bien en la geometria actual (96x96 sphere)

**5.3 — Normal mapping procedural**
- Calcular normales via derivadas del displacement en vez de depender de las vertex normals
- Agrega detalle de iluminacion sin necesitar mas vertices
- Puede usar derivadas del noise directamente

**5.4 — Ocean specular mejorado**
- Reflexion especular del sol en el oceano (sun glint)
- Roughness muy baja para el agua
- Normal perturbation con noise de alta freq para olas microscopicas

**5.5 — Snow en slopes planos**
- Nieve solo se acumula en superficies planas (slope < threshold)
- Arriba de cierta elevacion + slope bajo = nieve
- Slope alto = roca expuesta incluso a altitud de nieve

### Resultado esperado
60fps estables, iluminacion realista, detalles visuales pulidos.

---

## Resumen de Archivos Afectados por Sesion

| Sesion | Archivos |
|--------|----------|
| 1 | `src/lib/noise.js`, `src/shaders/planet.js`, `src/gui.ts` |
| 2 | `src/lib/noise.js`, `src/shaders/planet.js`, `src/gui.ts` |
| 3 | `src/shaders/planet.js`, `src/gui.ts`, `src/palettes.ts` |
| 4 | `src/shaders/planet.js`, `src/presets.ts` (nuevo), `src/scene.ts`, `src/gui.ts` |
| 5 | `src/shaders/planet.js`, `src/shaders/clouds.js`, posiblemente compute shader nuevo |

## Dependencias entre Sesiones

```
Sesion 1 (noise base + ridged + erosion)
    |
    v
Sesion 2 (multi-escala + worley)
    |
    v
Sesion 3 (coloring avanzado)      <-- puede hacerse en paralelo con 2
    |
    v
Sesion 4 (tipos de planeta)       <-- requiere 2 y 3
    |
    v
Sesion 5 (performance + polish)   <-- requiere todo lo anterior
```

## Notas Tecnicas

- **Imports MaterialX**: `import { mx_perlin_noise_float, mx_worley_noise_float, mx_fractal_noise_float } from 'three/nodes/materialx/MaterialXNodes.js'`
- **Ridged noise formula**: `signal = 1.0 - abs(noise * 2.0 - 1.0); signal = signal^2 * weight; weight = clamp(signal * gain, 0, 1)`
- **IQ derivatives**: `value += amp * n.x / (1 + dot(d, d)); d += n.yz * amp`
- **Worley para grietas**: usar `1.0 - mx_worley_noise_float(pos, jitter, 0)` = distancia inversa, bright en edges
- **Slope calculation**: `slope = length(dFdx(elevation), dFdy(elevation))` o central differences en 3D
- **Lacunarity recomendada**: 1.92 en vez de 2.0 para evitar alineacion de lattice entre octavas
