import type { Sketch, SketchLine, SketchCircle } from '../../sketch/entities'

export interface SketchEdge {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface SketchCircleEdge {
  type: 'circle'
  cx: number
  cy: number
  radius: number
}

export type OCCSketchEdge = SketchEdge | SketchCircleEdge

export function sketchToEdges(sketch: Sketch): OCCSketchEdge[] {
  const edges: OCCSketchEdge[] = []

  for (const entity of sketch.entities.values()) {
    if (entity.type === 'line') {
      const line = entity as SketchLine
      const start = sketch.points.get(line.startId)
      const end = sketch.points.get(line.endId)
      if (start && end) {
        edges.push({
          type: 'line',
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
        })
      }
    } else if (entity.type === 'circle') {
      const circle = entity as SketchCircle
      const center = sketch.points.get(circle.centerId)
      if (center) {
        edges.push({
          type: 'circle',
          cx: center.x,
          cy: center.y,
          radius: circle.radius,
        })
      }
    }
  }

  return edges
}
