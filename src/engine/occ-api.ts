import type { TessellationData, ShapeRef } from './types'

type WorkerResult<T> = { shapeRef: ShapeRef; tessellation: TessellationData } | T

let worker: Worker
let nextId = 1
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()

function call<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, method, args })
  })
}

function handleMessage(e: MessageEvent) {
  const { id, result, error } = e.data
  const p = pending.get(id)
  if (!p) return
  pending.delete(id)
  if (error) {
    p.reject(new Error(error))
  } else {
    p.resolve(result)
  }
}

export const occApi = {
  async init(): Promise<string> {
    worker = new Worker(new URL('./occ-worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = handleMessage
    return call<string>('init')
  },

  createBox(width: number, height: number, depth: number) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>('createBox', width, height, depth)
  },

  createCylinder(radius: number, height: number) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>('createCylinder', radius, height)
  },

  createSphere(radius: number) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>('createSphere', radius)
  },

  tessellate(shapeRef: ShapeRef, deflection?: number) {
    return call<TessellationData>('tessellate', shapeRef, deflection)
  },

  deleteShape(shapeRef: ShapeRef) {
    return call<void>('deleteShape', shapeRef)
  },

  exportSTL(shapeRef: ShapeRef, deflection?: number) {
    return call<ArrayBuffer>('exportSTL', shapeRef, deflection)
  },

  fuseShapes(refA: ShapeRef, refB: ShapeRef) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>('fuseShapes', refA, refB)
  },

  cutShapes(refA: ShapeRef, refB: ShapeRef) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>('cutShapes', refA, refB)
  },

  commonShapes(refA: ShapeRef, refB: ShapeRef) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>('commonShapes', refA, refB)
  },

  extrudeSketch(
    edges: Array<{ type: 'line'; x1: number; y1: number; x2: number; y2: number } |
                  { type: 'circle'; cx: number; cy: number; radius: number } |
                  { type: 'arc'; cx: number; cy: number; radius: number; startAngle: number; endAngle: number }>,
    depth: number,
    planeOrigin: [number, number, number],
    planeNormal: [number, number, number],
    planeXAxis: [number, number, number],
    operation: 'new' | 'fuse' | 'cut',
    existingShapeRef?: ShapeRef,
  ) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>(
      'extrudeSketch', edges, depth, planeOrigin, planeNormal, planeXAxis, operation, existingShapeRef
    )
  },

  filletShape(shapeRef: ShapeRef, edgeIndices: number[], radius: number) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>('filletShape', shapeRef, edgeIndices, radius)
  },

  chamferShape(shapeRef: ShapeRef, edgeIndices: number[], distance: number) {
    return call<{ shapeRef: ShapeRef; tessellation: TessellationData }>('chamferShape', shapeRef, edgeIndices, distance)
  },
}
