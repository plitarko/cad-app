import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { Line, Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { Workplane, SketchPoint } from '../sketch/entities'
import { pointToWorld } from '../sketch/entities'
import { useAppStore } from '../kernel/store'

interface ExtrudeArrowProps {
  workplane: Workplane
  points: Record<string, SketchPoint>
  entities: Record<string, any>
  onExtrude: (depth: number) => void
}

export function ExtrudeArrow({ workplane, points, entities, onExtrude }: ExtrudeArrowProps) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)
  const dragStartScreenY = useRef(0)
  const dragStartDepth = useRef(0)
  const { camera, gl } = useThree()
  const setIsDraggingExtrude = useAppStore((s) => s.setIsDraggingExtrude)

  const center = useMemo(() => {
    const allPts = Object.values(points) as SketchPoint[]
    if (allPts.length === 0) return new THREE.Vector3()
    let sumU = 0, sumV = 0
    for (const p of allPts) { sumU += p.x; sumV += p.y }
    const c = pointToWorld(workplane, sumU / allPts.length, sumV / allPts.length)
    return new THREE.Vector3(...c)
  }, [points, workplane])

  const normalVec = useMemo(() => new THREE.Vector3(...workplane.normal), [workplane])

  // Arrow dimensions
  const arrowLength = 1.0
  const tipLength = 0.25
  const tipRadius = 0.1
  const shaftEnd = center.clone().addScaledVector(normalVec, arrowLength - tipLength)
  const tipPos = center.clone().addScaledVector(normalVec, arrowLength - tipLength / 2)

  const coneRotation = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVec)
  }, [normalVec])

  // Compute how many world units per pixel of mouse movement along the normal
  const getDepthPerPixel = useCallback(() => {
    // Project normal onto screen to determine scale
    const screenCenter = center.clone().project(camera)
    const screenNormalEnd = center.clone().addScaledVector(normalVec, 1).project(camera)
    const dx = (screenNormalEnd.x - screenCenter.x) * gl.domElement.clientWidth / 2
    const dy = (screenNormalEnd.y - screenCenter.y) * gl.domElement.clientHeight / 2
    const pixelsPerUnit = Math.sqrt(dx * dx + dy * dy)
    if (pixelsPerUnit < 0.01) return 0.02
    return 1 / pixelsPerUnit
  }, [camera, center, normalVec, gl])

  // Determine which screen direction corresponds to "more depth"
  const getNormalScreenDir = useCallback(() => {
    const screenCenter = center.clone().project(camera)
    const screenNormalEnd = center.clone().addScaledVector(normalVec, 1).project(camera)
    // Return normalized screen-space direction of the normal
    const dx = screenNormalEnd.x - screenCenter.x
    const dy = screenNormalEnd.y - screenCenter.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1e-6) return { x: 0, y: -1 } // fallback: up
    return { x: dx / len, y: dy / len }
  }, [camera, center, normalVec])

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation()
    e.nativeEvent?.stopImmediatePropagation?.()
    setDragging(true)
    setIsDraggingExtrude(true)
    setDragDepth(0)
    dragStartScreenY.current = e.nativeEvent?.clientY ?? e.clientY
    dragStartDepth.current = 0
    gl.domElement.style.cursor = 'ns-resize'
    gl.domElement.setPointerCapture?.(e.nativeEvent?.pointerId ?? e.pointerId)
  }, [gl, setIsDraggingExtrude])

  useEffect(() => {
    if (!dragging) return

    const depthPerPixel = getDepthPerPixel()
    const normalDir = getNormalScreenDir()

    const handleMove = (e: PointerEvent) => {
      // Project mouse delta onto the screen-space normal direction
      const dy = e.clientY - dragStartScreenY.current
      // Mouse going "up" on screen = negative dy, should map to positive depth if normal points up
      const screenDelta = -dy // flip because screen Y is inverted
      // Project onto the normal's screen direction (use Y component since we're using vertical drag)
      const depth = screenDelta * depthPerPixel
      const snapped = Math.round(depth * 10) / 10
      setDragDepth(snapped)
    }

    const handleUp = (e: PointerEvent) => {
      setDragging(false)
      setIsDraggingExtrude(false)
      gl.domElement.style.cursor = 'default'
      gl.domElement.releasePointerCapture?.(e.pointerId)
      // Read the latest dragDepth via a ref-like approach
      setDragDepth((currentDepth) => {
        if (Math.abs(currentDepth) > 0.05) {
          // Use setTimeout to avoid state update during render
          setTimeout(() => onExtrude(currentDepth), 0)
        }
        return 0
      })
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [dragging, getDepthPerPixel, getNormalScreenDir, gl, onExtrude, setIsDraggingExtrude])

  const color = dragging ? '#f59e0b' : hovered ? '#f59e0b' : '#3b82f6'

  // Build preview extrusion geometry from sketch shape
  const previewGeometry = useMemo(() => {
    if (Math.abs(dragDepth) < 0.01) return null
    return buildExtrudePreview(points, entities, workplane, dragDepth)
  }, [points, entities, workplane, dragDepth])

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
        <cylinderGeometry args={[0.18, 0.18, arrowLength, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* 3D extrusion preview */}
      {dragging && previewGeometry && (
        <mesh geometry={previewGeometry}>
          <meshStandardMaterial
            color="#f59e0b"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Depth indicator line + label */}
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

/** Build a Three.js ExtrudeGeometry from sketch entities for preview */
function buildExtrudePreview(
  points: Record<string, SketchPoint>,
  entities: Record<string, any>,
  workplane: Workplane,
  depth: number,
): THREE.BufferGeometry | null {
  // Try to build a THREE.Shape from lines forming a closed loop
  const lineEntities = Object.values(entities).filter((e) => e.type === 'line')
  const circleEntities = Object.values(entities).filter((e) => e.type === 'circle')

  if (circleEntities.length > 0 && lineEntities.length === 0) {
    // Circle extrusion = cylinder preview
    const circle = circleEntities[0]
    const center = points[circle.centerId]
    if (!center) return null
    const worldCenter = pointToWorld(workplane, center.x, center.y)
    const normal = new THREE.Vector3(...workplane.normal)
    const geo = new THREE.CylinderGeometry(circle.radius, circle.radius, Math.abs(depth), 32)
    // Orient cylinder along normal
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), depth > 0 ? normal : normal.clone().negate())
    const mat = new THREE.Matrix4().makeRotationFromQuaternion(q)
    const offset = normal.clone().multiplyScalar(depth / 2)
    mat.setPosition(worldCenter[0] + offset.x, worldCenter[1] + offset.y, worldCenter[2] + offset.z)
    geo.applyMatrix4(mat)
    return geo
  }

  if (lineEntities.length < 2) return null

  // Build adjacency: find connected loops
  // Simple approach: order edges into a path
  const edgeMap = new Map<string, string[]>()
  for (const e of lineEntities) {
    if (!edgeMap.has(e.startId)) edgeMap.set(e.startId, [])
    edgeMap.get(e.startId)!.push(e.endId)
    if (!edgeMap.has(e.endId)) edgeMap.set(e.endId, [])
    edgeMap.get(e.endId)!.push(e.startId)
  }

  // Walk the loop
  const visited = new Set<string>()
  const firstId = lineEntities[0].startId
  const path: string[] = [firstId]
  visited.add(firstId)
  let current = firstId
  while (true) {
    const neighbors = edgeMap.get(current) || []
    const next = neighbors.find((n) => !visited.has(n))
    if (!next) break
    path.push(next)
    visited.add(next)
    current = next
  }

  if (path.length < 3) return null

  // Build THREE.Shape in workplane 2D coords
  const shape = new THREE.Shape()
  const firstPt = points[path[0]]
  if (!firstPt) return null
  shape.moveTo(firstPt.x, firstPt.y)
  for (let i = 1; i < path.length; i++) {
    const pt = points[path[i]]
    if (!pt) return null
    shape.lineTo(pt.x, pt.y)
  }
  shape.closePath()

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: Math.abs(depth),
    bevelEnabled: false,
  }

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)

  // The geometry is in XY plane by default, we need to transform it to the workplane
  const xAxis = new THREE.Vector3(...workplane.xAxis)
  const yAxis = new THREE.Vector3(...workplane.yAxis)
  const normal = new THREE.Vector3(...workplane.normal)
  const origin = new THREE.Vector3(...workplane.origin)

  // Build rotation matrix from workplane axes
  const mat = new THREE.Matrix4()
  mat.makeBasis(xAxis, yAxis, depth > 0 ? normal : normal.clone().negate())
  mat.setPosition(origin)
  geo.applyMatrix4(mat)

  return geo
}
