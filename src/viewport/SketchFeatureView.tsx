import { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useAppStore, type Feature } from '../kernel/store'
import type { Workplane, SketchPoint } from '../sketch/entities'
import { pointToWorld } from '../sketch/entities'

interface SketchFeatureViewProps {
  feature: Feature
  isSelected: boolean
}

export function SketchFeatureView({ feature, isSelected }: SketchFeatureViewProps) {
  const setSelectedFeatureId = useAppStore((s) => s.setSelectedFeatureId)

  const params = feature.params as {
    workplane: Workplane
    points: Record<string, SketchPoint>
    entities: Record<string, any>
  }

  const wp = params.workplane
  const color = isSelected ? '#22d3ee' : '#6366f1'

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation()
      setSelectedFeatureId(feature.id)
    },
    [feature.id, setSelectedFeatureId],
  )

  const { lines, circles } = useMemo(() => {
    const lines: { points: [number, number, number][] }[] = []
    const circles: { center: [number, number, number]; radius: number }[] = []

    for (const entity of Object.values(params.entities)) {
      if (entity.type === 'line') {
        const start = params.points[entity.startId]
        const end = params.points[entity.endId]
        if (start && end) {
          lines.push({
            points: [
              pointToWorld(wp, start.x, start.y),
              pointToWorld(wp, end.x, end.y),
            ],
          })
        }
      } else if (entity.type === 'circle') {
        const center = params.points[entity.centerId]
        if (center) {
          circles.push({
            center: pointToWorld(wp, center.x, center.y),
            radius: entity.radius,
          })
        }
      }
    }

    return { lines, circles }
  }, [params, wp])

  const pointPositions = useMemo(() => {
    return Object.values(params.points).map((p: SketchPoint) =>
      pointToWorld(wp, p.x, p.y)
    )
  }, [params.points, wp])

  // Compute bounding box center and size for the invisible click plane
  const { center, size } = useMemo(() => {
    const allPts = Object.values(params.points) as SketchPoint[]
    if (allPts.length === 0) return { center: [0, 0, 0] as [number, number, number], size: 1 }
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
    for (const p of allPts) {
      minU = Math.min(minU, p.x); maxU = Math.max(maxU, p.x)
      minV = Math.min(minV, p.y); maxV = Math.max(maxV, p.y)
    }
    const cu = (minU + maxU) / 2
    const cv = (minV + maxV) / 2
    const s = Math.max(maxU - minU, maxV - minV, 1) + 1 // pad a bit
    return { center: pointToWorld(wp, cu, cv), size: s }
  }, [params.points, wp])

  // Quaternion to orient the click plane to match the workplane
  const planeRotation = useMemo(() => {
    const normal = new THREE.Vector3(...wp.normal)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    return q
  }, [wp])

  return (
    <group>
      {/* Invisible click target plane covering the sketch area */}
      <mesh
        position={center}
        quaternion={planeRotation}
        onClick={handleClick}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Visible lines */}
      {lines.map((line, i) => (
        <ClickableLine key={`line-${i}`} points={line.points} color={color} lineWidth={isSelected ? 2.5 : 1.5} onClick={handleClick} />
      ))}

      {/* Visible circles */}
      {circles.map((circle, i) => (
        <CircleRender key={`circle-${i}`} center={circle.center} radius={circle.radius} workplane={wp} color={color} lineWidth={isSelected ? 2.5 : 1.5} onClick={handleClick} />
      ))}

      {/* Points */}
      {pointPositions.map((pos, i) => (
        <mesh key={`pt-${i}`} position={pos} onClick={handleClick}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

function ClickableLine({
  points,
  color,
  lineWidth,
  onClick,
}: {
  points: [number, number, number][]
  color: string
  lineWidth: number
  onClick: (e: any) => void
}) {
  // Invisible tube along the line for click detection
  const tubeGeo = useMemo(() => {
    if (points.length < 2) return null
    const path = new THREE.LineCurve3(
      new THREE.Vector3(...points[0]),
      new THREE.Vector3(...points[1]),
    )
    return new THREE.TubeGeometry(path, 1, 0.15, 6, false)
  }, [points])

  return (
    <>
      <Line points={points} color={color} lineWidth={lineWidth} />
      {tubeGeo && (
        <mesh geometry={tubeGeo} onClick={onClick}>
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </>
  )
}

function CircleRender({
  center,
  radius,
  workplane,
  color,
  lineWidth,
  onClick,
}: {
  center: [number, number, number]
  radius: number
  workplane: Workplane
  color: string
  lineWidth: number
  onClick: (e: any) => void
}) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    const segments = 64
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const u = Math.cos(angle) * radius
      const v = Math.sin(angle) * radius
      pts.push([
        center[0] + u * workplane.xAxis[0] + v * workplane.yAxis[0],
        center[1] + u * workplane.xAxis[1] + v * workplane.yAxis[1],
        center[2] + u * workplane.xAxis[2] + v * workplane.yAxis[2],
      ])
    }
    return pts
  }, [center, radius, workplane])

  // Invisible torus for click detection
  const torusRotation = useMemo(() => {
    const normal = new THREE.Vector3(...workplane.normal)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    return q
  }, [workplane])

  return (
    <>
      <Line points={points} color={color} lineWidth={lineWidth} />
      <mesh position={center} quaternion={torusRotation} onClick={onClick}>
        <torusGeometry args={[radius, 0.15, 6, 64]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  )
}
