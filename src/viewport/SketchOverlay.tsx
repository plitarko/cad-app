import { useMemo, useCallback, useRef } from 'react'
import * as THREE from 'three'
import { Line, Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useSketchStore } from '../sketch/sketch-engine'
import type { Workplane, SketchLine, SketchCircle } from '../sketch/entities'
import { pointToWorld, worldToPlane } from '../sketch/entities'
import {
  lineToolClick, lineToolMove, lineToolDoubleClick, lineToolReset,
} from '../sketch/tools/line-tool'
import {
  rectToolClick, rectToolMove, rectToolReset,
} from '../sketch/tools/rect-tool'
import {
  circleToolClick, circleToolMove, circleToolReset,
} from '../sketch/tools/circle-tool'

interface SketchOverlayProps {
  workplane: Workplane
}

export function SketchOverlay({ workplane }: SketchOverlayProps) {
  const activeSketch = useSketchStore((s) => s.activeSketch)
  const activeTool = useSketchStore((s) => s.activeTool)
  const previewPoints = useSketchStore((s) => s.previewPoints)
  const snapPoint = useSketchStore((s) => s.snapPoint)
  const planeRef = useRef<THREE.Mesh>(null)
  const { raycaster, camera } = useThree()

  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(...workplane.normal), 0),
    [workplane],
  )

  const projectToPlane = useCallback(
    (event: { point?: THREE.Vector3; ray?: THREE.Ray; unprojectedPoint?: THREE.Vector2 }) => {
      const target = new THREE.Vector3()
      if (event.point) {
        const [u, v] = worldToPlane(workplane, event.point.x, event.point.y, event.point.z)
        return [u, v] as [number, number]
      }
      return null
    },
    [workplane],
  )

  const handlePointerMove = useCallback(
    (event: any) => {
      event.stopPropagation()
      if (!event.point) return
      const [u, v] = worldToPlane(workplane, event.point.x, event.point.y, event.point.z)

      switch (activeTool) {
        case 'line': lineToolMove(u, v); break
        case 'rect': rectToolMove(u, v); break
        case 'circle': circleToolMove(u, v); break
      }
    },
    [workplane, activeTool],
  )

  const handleClick = useCallback(
    (event: any) => {
      event.stopPropagation()
      if (!event.point) return
      const [u, v] = worldToPlane(workplane, event.point.x, event.point.y, event.point.z)

      switch (activeTool) {
        case 'line': lineToolClick(u, v); break
        case 'rect': rectToolClick(u, v); break
        case 'circle': circleToolClick(u, v); break
      }
    },
    [workplane, activeTool],
  )

  const handleDoubleClick = useCallback(
    (event: any) => {
      event.stopPropagation()
      if (activeTool === 'line') lineToolDoubleClick()
    },
    [activeTool],
  )

  if (!activeSketch) return null

  // Convert sketch entities to world-space rendering
  const lines: { points: [number, number, number][] }[] = []
  const circles: { center: [number, number, number]; radius: number }[] = []

  for (const entity of activeSketch.entities.values()) {
    if (entity.type === 'line') {
      const start = activeSketch.points.get((entity as SketchLine).startId)
      const end = activeSketch.points.get((entity as SketchLine).endId)
      if (start && end) {
        lines.push({
          points: [
            pointToWorld(workplane, start.x, start.y),
            pointToWorld(workplane, end.x, end.y),
          ],
        })
      }
    } else if (entity.type === 'circle') {
      const center = activeSketch.points.get((entity as SketchCircle).centerId)
      if (center) {
        circles.push({
          center: pointToWorld(workplane, center.x, center.y),
          radius: (entity as SketchCircle).radius,
        })
      }
    }
  }

  // Preview line
  const previewWorldPoints = previewPoints.map(([u, v]) => pointToWorld(workplane, u, v))

  // Snap indicator
  const snapWorldPoint = snapPoint ? pointToWorld(workplane, snapPoint[0], snapPoint[1]) : null

  // Points
  const pointPositions = Array.from(activeSketch.points.values()).map((p) =>
    pointToWorld(workplane, p.x, p.y),
  )

  return (
    <>
      {/* Invisible interaction plane */}
      <mesh
        ref={planeRef}
        position={workplane.origin}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Sketch lines */}
      {lines.map((line, i) => (
        <Line key={`line-${i}`} points={line.points} color="#22d3ee" lineWidth={2} />
      ))}

      {/* Sketch circles */}
      {circles.map((circle, i) => (
        <CircleRender key={`circle-${i}`} center={circle.center} radius={circle.radius} workplane={workplane} />
      ))}

      {/* Points */}
      {pointPositions.map((pos, i) => (
        <mesh key={`point-${i}`} position={pos}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>
      ))}

      {/* Preview */}
      {previewWorldPoints.length >= 2 && (
        <Line points={previewWorldPoints} color="#fbbf24" lineWidth={1.5} dashed dashSize={0.2} gapSize={0.1} />
      )}

      {/* Snap indicator */}
      {snapWorldPoint && (
        <mesh position={snapWorldPoint}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      )}
    </>
  )
}

function CircleRender({
  center,
  radius,
  workplane,
}: {
  center: [number, number, number]
  radius: number
  workplane: Workplane
}) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    const segments = 64
    // We need to generate circle points in the workplane
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const u = Math.cos(angle) * radius
      const v = Math.sin(angle) * radius
      // Offset from center in workplane coords
      pts.push([
        center[0] + u * workplane.xAxis[0] + v * workplane.yAxis[0],
        center[1] + u * workplane.xAxis[1] + v * workplane.yAxis[1],
        center[2] + u * workplane.xAxis[2] + v * workplane.yAxis[2],
      ])
    }
    return pts
  }, [center, radius, workplane])

  return <Line points={points} color="#22d3ee" lineWidth={2} />
}
