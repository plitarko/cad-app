import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { Feature } from '../kernel/store'
import type { Workplane, SketchLine, SketchCircle, SketchPoint } from '../sketch/entities'
import { pointToWorld } from '../sketch/entities'

interface SketchFeatureViewProps {
  feature: Feature
  isSelected: boolean
}

export function SketchFeatureView({ feature, isSelected }: SketchFeatureViewProps) {
  const params = feature.params as {
    workplane: Workplane
    points: Record<string, SketchPoint>
    entities: Record<string, any>
  }

  const wp = params.workplane
  const color = isSelected ? '#22d3ee' : '#6366f1'

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

  return (
    <group>
      {lines.map((line, i) => (
        <Line key={`line-${i}`} points={line.points} color={color} lineWidth={isSelected ? 2.5 : 1.5} />
      ))}

      {circles.map((circle, i) => (
        <CircleRender key={`circle-${i}`} center={circle.center} radius={circle.radius} workplane={wp} color={color} lineWidth={isSelected ? 2.5 : 1.5} />
      ))}

      {pointPositions.map((pos, i) => (
        <mesh key={`pt-${i}`} position={pos}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

function CircleRender({
  center,
  radius,
  workplane,
  color,
  lineWidth,
}: {
  center: [number, number, number]
  radius: number
  workplane: Workplane
  color: string
  lineWidth: number
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

  return <Line points={points} color={color} lineWidth={lineWidth} />
}
