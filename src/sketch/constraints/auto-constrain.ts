import type { SketchPoint, SketchConstraint } from '../entities'
import { useSketchStore } from '../sketch-engine'

const ANGLE_THRESHOLD = 3 // degrees
const DISTANCE_THRESHOLD = 0.3

export function detectAutoConstraints(
  startPt: SketchPoint,
  endPt: SketchPoint,
): Omit<SketchConstraint, 'id'>[] {
  const constraints: Omit<SketchConstraint, 'id'>[] = []

  const dx = endPt.x - startPt.x
  const dy = endPt.y - startPt.y
  const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI))

  // Horizontal
  if (angle < ANGLE_THRESHOLD || Math.abs(angle - 180) < ANGLE_THRESHOLD) {
    constraints.push({
      type: 'horizontal',
      entityIds: [],
      pointIds: [startPt.id, endPt.id],
    })
  }

  // Vertical
  if (Math.abs(angle - 90) < ANGLE_THRESHOLD || Math.abs(angle - 270) < ANGLE_THRESHOLD) {
    constraints.push({
      type: 'vertical',
      entityIds: [],
      pointIds: [startPt.id, endPt.id],
    })
  }

  return constraints
}

export function detectCoincident(
  pointId: string,
  x: number,
  y: number,
  threshold = DISTANCE_THRESHOLD,
): Omit<SketchConstraint, 'id'> | null {
  const sketch = useSketchStore.getState().activeSketch
  if (!sketch) return null

  for (const [id, point] of sketch.points) {
    if (id === pointId) continue
    if (Math.hypot(point.x - x, point.y - y) < threshold) {
      return {
        type: 'coincident',
        entityIds: [],
        pointIds: [pointId, id],
      }
    }
  }
  return null
}
