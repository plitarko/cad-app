import { useSketchStore } from '../sketch-engine'

export interface LineToolState {
  startPointId: string | null
}

const state: LineToolState = { startPointId: null }

export function lineToolReset() {
  state.startPointId = null
  useSketchStore.getState().setPreviewPoints([])
}

export function lineToolClick(u: number, v: number) {
  const store = useSketchStore.getState()
  const [su, sv] = store.snapToGrid(u, v)

  // Check for nearby existing point to snap to
  const nearby = store.findNearbyPoint(su, sv, 0.5)

  if (state.startPointId === null) {
    // First click: set start point
    if (nearby) {
      state.startPointId = nearby.id
    } else {
      const point = store.addPoint(su, sv)
      state.startPointId = point.id
    }
  } else {
    // Second click: create line and chain
    let endPointId: string
    if (nearby) {
      endPointId = nearby.id
    } else {
      const point = store.addPoint(su, sv)
      endPointId = point.id
    }

    if (endPointId !== state.startPointId) {
      store.addLine(state.startPointId, endPointId)

      // Auto-detect horizontal/vertical constraints
      const startPt = store.getPoint(state.startPointId)
      const endPt = store.getPoint(endPointId)
      if (startPt && endPt) {
        if (Math.abs(startPt.y - endPt.y) < 0.01) {
          store.addConstraint({ type: 'horizontal', entityIds: [], pointIds: [state.startPointId, endPointId] })
        } else if (Math.abs(startPt.x - endPt.x) < 0.01) {
          store.addConstraint({ type: 'vertical', entityIds: [], pointIds: [state.startPointId, endPointId] })
        }
      }
    }

    // Chain: end point becomes start of next line
    state.startPointId = endPointId
  }
}

export function lineToolMove(u: number, v: number) {
  const store = useSketchStore.getState()
  const [su, sv] = store.snapToGrid(u, v)

  if (state.startPointId !== null) {
    const startPt = store.getPoint(state.startPointId)
    if (startPt) {
      store.setPreviewPoints([[startPt.x, startPt.y], [su, sv]])
    }
  }

  // Check snap
  const nearby = store.findNearbyPoint(su, sv, 0.5)
  store.setSnapPoint(nearby ? [nearby.x, nearby.y] : null)
}

export function lineToolDoubleClick() {
  // End chain
  lineToolReset()
}
