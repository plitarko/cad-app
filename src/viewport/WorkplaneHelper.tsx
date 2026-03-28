import { useMemo } from 'react'
import * as THREE from 'three'
import { Grid } from '@react-three/drei'
import type { Workplane } from '../sketch/entities'

interface WorkplaneHelperProps {
  workplane: Workplane
}

export function WorkplaneHelper({ workplane }: WorkplaneHelperProps) {
  const { rotation, position } = useMemo(() => {
    const normal = new THREE.Vector3(...workplane.normal)
    const up = new THREE.Vector3(0, 0, 1)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    return {
      rotation: euler,
      position: new THREE.Vector3(...workplane.origin),
    }
  }, [workplane])

  return (
    <group position={position} rotation={rotation}>
      {/* Semi-transparent plane indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.03} side={THREE.DoubleSide} />
      </mesh>

      {/* Sketch grid */}
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3b82f680"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3b82f6a0"
        fadeDistance={30}
        infiniteGrid
      />
    </group>
  )
}
