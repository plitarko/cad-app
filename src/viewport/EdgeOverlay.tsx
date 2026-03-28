import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { TessellationData } from '../engine/types'

interface EdgeOverlayProps {
  tessellation: TessellationData
}

export function EdgeOverlay({ tessellation }: EdgeOverlayProps) {
  return (
    <group>
      {tessellation.edges.map((edge) => (
        <EdgeLine key={edge.edgeIndex} edge={edge} />
      ))}
    </group>
  )
}

function EdgeLine({ edge }: { edge: TessellationData['edges'][0] }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i < edge.points.length; i += 3) {
      pts.push([edge.points[i], edge.points[i + 1], edge.points[i + 2]])
    }
    return pts
  }, [edge])

  if (points.length < 2) return null

  return (
    <Line
      points={points}
      color="#1e293b"
      lineWidth={1.5}
    />
  )
}
