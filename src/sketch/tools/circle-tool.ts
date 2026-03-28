import { useSketchStore } from '../sketch-engine'

export interface CircleToolState {
  center: [number, number] | null
  centerId: string | null
}

const state: CircleToolState = { center: null, centerId: null }

export function circleToolReset() {
  state.center = null
  state.centerId = null
  useSketchStore.getState().setPreviewPoints([])
}

export function circleToolClick(u: number, v: number) {
  const store = useSketchStore.getState()
  const [su, sv] = store.snapToGrid(u, v)

  if (state.center === null) {
    state.center = [su, sv]
    const pt = store.addPoint(su, sv)
    state.centerId = pt.id
  } else {
    const radius = Math.hypot(su - state.center[0], sv - state.center[1])
    if (radius > 0.01 && state.centerId) {
      store.addCircle(state.centerId, radius)
    }
    circleToolReset()
  }
}

export function circleToolMove(u: number, v: number) {
  const store = useSketchStore.getState()
  const [su, sv] = store.snapToGrid(u, v)

  if (state.center !== null) {
    const radius = Math.hypot(su - state.center[0], sv - state.center[1])
    // Generate circle preview as series of points
    const points: [number, number][] = []
    const segments = 64
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push([
        state.center[0] + Math.cos(angle) * radius,
        state.center[1] + Math.sin(angle) * radius,
      ])
    }
    store.setPreviewPoints(points)
  }
}
