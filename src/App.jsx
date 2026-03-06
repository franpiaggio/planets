import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Planet from './components/Planet'

export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
      <color attach="background" args={['#000011']} />
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <Planet />
      <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={10} />
    </Canvas>
  )
}
