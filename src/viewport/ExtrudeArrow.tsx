import { useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { Line, Html, Cone } from '@react-three/drei'
import type { Workplane, SketchPoint } from '../sketch/entities'
import { pointToWorld } from '../sketch/entities'

interface ExtrudeArrowProps {
  workplane: Workplane
  points: Record<string, SketchPoint>
  onClick: () => void
}

export function ExtrudeArrow({ workplane, points, onClick }: ExtrudeArrowProps) {
  const [hovered, setHovered] = useState(false)

  // Compute sketch center
  const center = useMemo(() => {
    const allPts = Object.values(points) as SketchPoint[]
    if (allPts.length === 0) return [0, 0, 0] as [number, number, number]
    let sumU = 0, sumV = 0
    for (const p of allPts) { sumU += p.x; sumV += p.y }
    return pointToWorld(workplane, sumU / allPts.length, sumV / allPts.length)
  }, [points, workplane])

  const normal = workplane.normal
  const arrowLength = 3
  const tipLength = 0.6
  const shaftEnd: [number, number, number] = [
    center[0] + normal[0] * (arrowLength - tipLength),
    center[1] + normal[1] * (arrowLength - tipLength),
    center[2] + normal[2] * (arrowLength - tipLength),
  ]
  const tipPos: [number, number, number] = [
    center[0] + normal[0] * (arrowLength - tipLength / 2),
    center[1] + normal[1] * (arrowLength - tipLength / 2),
    center[2] + normal[2] * (arrowLength - tipLength / 2),
  ]

  // Orient the cone along the normal
  const coneRotation = useMemo(() => {
    const dir = new THREE.Vector3(...normal)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return q
  }, [normal])

  const color = hovered ? '#f59e0b' : '#3b82f6'

  const handleClick = useCallback((e: any) => {
    e.stopPropagation()
    onClick()
  }, [onClick])

  return (
    <group>
      {/* Shaft line */}
      <Line
        points={[center, shaftEnd]}
        color={color}
        lineWidth={hovered ? 4 : 2.5}
      />

      {/* Cone tip */}
      <mesh
        position={tipPos}
        quaternion={coneRotation}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <coneGeometry args={[0.25, tipLength, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.5 : 0.2} />
      </mesh>

      {/* Invisible larger hit area along the whole arrow */}
      <mesh
        position={[
          center[0] + normal[0] * arrowLength / 2,
          center[1] + normal[1] * arrowLength / 2,
          center[2] + normal[2] * arrowLength / 2,
        ]}
        quaternion={coneRotation}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <cylinderGeometry args={[0.3, 0.3, arrowLength, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Label */}
      {hovered && (
        <Html
          position={[
            tipPos[0] + normal[0] * 0.5,
            tipPos[1] + normal[1] * 0.5,
            tipPos[2] + normal[2] * 0.5,
          ]}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: '#0f172a',
            color: '#f59e0b',
            padding: '3px 8px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: '1px solid #f59e0b40',
          }}>
            Click to extrude
          </div>
        </Html>
      )}
    </group>
  )
}
