import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Planet() {
  const meshRef = useRef()

  useFrame((_, delta) => {
    meshRef.current.rotation.y += delta * 0.15
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial color="#cccccc" roughness={0.7} metalness={0.0} />
    </mesh>
  )
}
