import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { Line, Html } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import type { Workplane, SketchPoint } from '../sketch/entities'
import { pointToWorld } from '../sketch/entities'

interface ExtrudeArrowProps {
  workplane: Workplane
  points: Record<string, SketchPoint>
  onExtrude: (depth: number) => void
}

export function ExtrudeArrow({ workplane, points, onExtrude }: ExtrudeArrowProps) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)
  const dragStartRef = useRef<THREE.Vector3 | null>(null)
  const { camera, gl } = useThree()

  const center = useMemo(() => {
    const allPts = Object.values(points) as SketchPoint[]
    if (allPts.length === 0) return new THREE.Vector3()
    let sumU = 0, sumV = 0
    for (const p of allPts) { sumU += p.x; sumV += p.y }
    const c = pointToWorld(workplane, sumU / allPts.length, sumV / allPts.length)
    return new THREE.Vector3(...c)
  }, [points, workplane])

  const normalVec = useMemo(() => new THREE.Vector3(...workplane.normal), [workplane])

  // Arrow dimensions (small)
  const arrowLength = 1.2
  const tipLength = 0.3
  const tipRadius = 0.12
  const shaftEnd = center.clone().addScaledVector(normalVec, arrowLength - tipLength)
  const tipPos = center.clone().addScaledVector(normalVec, arrowLength - tipLength / 2)

  const coneRotation = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVec)
  }, [normalVec])

  // Project mouse position onto the normal axis to get drag depth
  const getDepthFromPointer = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

    // Find closest point on the normal line to the ray
    const rayOrigin = raycaster.ray.origin
    const rayDir = raycaster.ray.direction

    // Project onto normal axis: find t such that (center + t*normal) is closest to ray
    const w = center.clone().sub(rayOrigin)
    const a = normalVec.dot(normalVec)
    const b = normalVec.dot(rayDir)
    const c = rayDir.dot(rayDir)
    const d = normalVec.dot(w)
    const e = rayDir.dot(w)
    const denom = a * c - b * b
    if (Math.abs(denom) < 1e-6) return 0
    const t = (a * e - b * d) / denom
    const s = (b * e - c * d) / denom // parameter along normal

    return s
  }, [camera, gl, center, normalVec])

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation()
    setDragging(true)
    setDragDepth(0)
    dragStartRef.current = new THREE.Vector3(e.clientX ?? e.nativeEvent?.clientX, e.clientY ?? e.nativeEvent?.clientY, 0)

    // Store the initial depth offset
    const clientX = e.nativeEvent?.clientX ?? e.clientX
    const clientY = e.nativeEvent?.clientY ?? e.clientY
    const startDepth = getDepthFromPointer(clientX, clientY)
    dragStartRef.current = new THREE.Vector3(clientX, clientY, startDepth)

    gl.domElement.style.cursor = 'ns-resize'
  }, [getDepthFromPointer, gl])

  useEffect(() => {
    if (!dragging) return

    const handleMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return
      const currentDepth = getDepthFromPointer(e.clientX, e.clientY)
      const startDepth = dragStartRef.current.z
      const depth = Math.round((currentDepth - startDepth) * 10) / 10
      setDragDepth(depth)
    }

    const handleUp = () => {
      setDragging(false)
      gl.domElement.style.cursor = 'default'
      if (Math.abs(dragDepth) > 0.05) {
        onExtrude(dragDepth)
      }
      setDragDepth(0)
      dragStartRef.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [dragging, dragDepth, getDepthFromPointer, gl, onExtrude])

  const color = dragging ? '#f59e0b' : hovered ? '#f59e0b' : '#3b82f6'

  // Preview extrusion line during drag
  const previewEnd = center.clone().addScaledVector(normalVec, dragDepth)

  return (
    <group>
      {/* Shaft */}
      <Line
        points={[center.toArray(), shaftEnd.toArray()]}
        color={color}
        lineWidth={hovered || dragging ? 3 : 2}
      />

      {/* Cone tip */}
      <mesh
        position={tipPos}
        quaternion={coneRotation}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); gl.domElement.style.cursor = 'ns-resize' }}
        onPointerOut={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = 'default' } }}
      >
        <coneGeometry args={[tipRadius, tipLength, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered || dragging ? 0.5 : 0.2} />
      </mesh>

      {/* Invisible larger hit area */}
      <mesh
        position={center.clone().addScaledVector(normalVec, arrowLength / 2).toArray()}
        quaternion={coneRotation}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); gl.domElement.style.cursor = 'ns-resize' }}
        onPointerOut={() => { if (!dragging) { setHovered(false); gl.domElement.style.cursor = 'default' } }}
      >
        <cylinderGeometry args={[0.2, 0.2, arrowLength, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Drag preview: dashed line showing extrusion depth */}
      {dragging && Math.abs(dragDepth) > 0.01 && (
        <>
          <Line
            points={[center.toArray(), previewEnd.toArray()]}
            color="#f59e0b"
            lineWidth={1.5}
            dashed
            dashSize={0.15}
            gapSize={0.1}
          />
          {/* Depth label */}
          <Html
            position={previewEnd.clone().addScaledVector(normalVec, 0.3).toArray()}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: '#0f172a',
              color: '#f59e0b',
              padding: '2px 6px',
              borderRadius: 3,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              border: '1px solid #f59e0b40',
            }}>
              {dragDepth.toFixed(1)} mm
            </div>
          </Html>
        </>
      )}
    </group>
  )
}
