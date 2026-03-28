import { create } from 'zustand'
import type {
  Sketch,
  SketchPoint,
  SketchEntity,
  SketchConstraint,
  SketchLine,
  SketchCircle,
  Workplane,
} from './entities'

export type SketchToolType = 'select' | 'line' | 'rect' | 'circle' | 'arc' | 'dimension'

interface SketchState {
  activeSketch: Sketch | null
  activeTool: SketchToolType
  previewPoints: [number, number][]
  snapPoint: [number, number] | null
  gridSize: number
  selectedEntityIds: string[]
  selectedPointIds: string[]

  // Actions
  startSketch: (workplane: Workplane) => void
  finishSketch: () => Sketch | null
  setTool: (tool: SketchToolType) => void
  setPreviewPoints: (points: [number, number][]) => void
  setSnapPoint: (point: [number, number] | null) => void

  addPoint: (x: number, y: number) => SketchPoint
  addLine: (startId: string, endId: string) => SketchLine
  addCircle: (centerId: string, radius: number) => SketchCircle
  addConstraint: (constraint: Omit<SketchConstraint, 'id'>) => SketchConstraint

  getPoint: (id: string) => SketchPoint | undefined
  updatePoint: (id: string, x: number, y: number) => void

  selectEntity: (id: string, addToSelection: boolean) => void
  clearSelection: () => void

  snapToGrid: (x: number, y: number) => [number, number]
  findNearbyPoint: (x: number, y: number, threshold: number) => SketchPoint | null
}

export const useSketchStore = create<SketchState>((set, get) => ({
  activeSketch: null,
  activeTool: 'line',
  previewPoints: [],
  snapPoint: null,
  gridSize: 1,
  selectedEntityIds: [],
  selectedPointIds: [],

  startSketch: (workplane) => {
    const sketch: Sketch = {
      id: crypto.randomUUID(),
      points: new Map(),
      entities: new Map(),
      constraints: new Map(),
      workplane,
    }
    set({ activeSketch: sketch, activeTool: 'line', previewPoints: [], selectedEntityIds: [], selectedPointIds: [] })
  },

  finishSketch: () => {
    const sketch = get().activeSketch
    set({ activeSketch: null, activeTool: 'select', previewPoints: [] })
    return sketch
  },

  setTool: (tool) => set({ activeTool: tool, previewPoints: [] }),
  setPreviewPoints: (points) => set({ previewPoints: points }),
  setSnapPoint: (point) => set({ snapPoint: point }),

  addPoint: (x, y) => {
    const sketch = get().activeSketch
    if (!sketch) throw new Error('No active sketch')
    const point: SketchPoint = { id: crypto.randomUUID(), x, y }
    sketch.points.set(point.id, point)
    set({ activeSketch: { ...sketch } })
    return point
  },

  addLine: (startId, endId) => {
    const sketch = get().activeSketch
    if (!sketch) throw new Error('No active sketch')
    const line: SketchLine = { id: crypto.randomUUID(), type: 'line', startId, endId }
    sketch.entities.set(line.id, line)
    set({ activeSketch: { ...sketch } })
    return line
  },

  addCircle: (centerId, radius) => {
    const sketch = get().activeSketch
    if (!sketch) throw new Error('No active sketch')
    const circle: SketchCircle = { id: crypto.randomUUID(), type: 'circle', centerId, radius }
    sketch.entities.set(circle.id, circle)
    set({ activeSketch: { ...sketch } })
    return circle
  },

  addConstraint: (constraint) => {
    const sketch = get().activeSketch
    if (!sketch) throw new Error('No active sketch')
    const c: SketchConstraint = { ...constraint, id: crypto.randomUUID() }
    sketch.constraints.set(c.id, c)
    set({ activeSketch: { ...sketch } })
    return c
  },

  getPoint: (id) => {
    return get().activeSketch?.points.get(id)
  },

  updatePoint: (id, x, y) => {
    const sketch = get().activeSketch
    if (!sketch) return
    const point = sketch.points.get(id)
    if (point) {
      point.x = x
      point.y = y
      set({ activeSketch: { ...sketch } })
    }
  },

  selectEntity: (id, addToSelection) => {
    const current = get().selectedEntityIds
    if (addToSelection) {
      if (current.includes(id)) {
        set({ selectedEntityIds: current.filter((eid) => eid !== id) })
      } else {
        set({ selectedEntityIds: [...current, id] })
      }
    } else {
      set({ selectedEntityIds: [id] })
    }
  },

  clearSelection: () => set({ selectedEntityIds: [], selectedPointIds: [] }),

  snapToGrid: (x, y) => {
    const grid = get().gridSize
    return [Math.round(x / grid) * grid, Math.round(y / grid) * grid]
  },

  findNearbyPoint: (x, y, threshold) => {
    const sketch = get().activeSketch
    if (!sketch) return null
    let closest: SketchPoint | null = null
    let closestDist = threshold
    for (const point of sketch.points.values()) {
      const dist = Math.hypot(point.x - x, point.y - y)
      if (dist < closestDist) {
        closestDist = dist
        closest = point
      }
    }
    return closest
  },
}))
