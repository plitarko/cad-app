import { useSketchStore } from '../sketch-engine'

export interface RectToolState {
  firstCorner: [number, number] | null
}

const state: RectToolState = { firstCorner: null }

export function rectToolReset() {
  state.firstCorner = null
  useSketchStore.getState().setPreviewPoints([])
}

export function rectToolClick(u: number, v: number) {
  const store = useSketchStore.getState()
  const [su, sv] = store.snapToGrid(u, v)

  if (state.firstCorner === null) {
    state.firstCorner = [su, sv]
  } else {
    const [x1, y1] = state.firstCorner
    const [x2, y2] = [su, sv]

    // Create 4 corner points
    const p1 = store.addPoint(x1, y1)
    const p2 = store.addPoint(x2, y1)
    const p3 = store.addPoint(x2, y2)
    const p4 = store.addPoint(x1, y2)

    // Create 4 lines
    store.addLine(p1.id, p2.id)
    store.addLine(p2.id, p3.id)
    store.addLine(p3.id, p4.id)
    store.addLine(p4.id, p1.id)

    // Add constraints
    store.addConstraint({ type: 'horizontal', entityIds: [], pointIds: [p1.id, p2.id] })
    store.addConstraint({ type: 'horizontal', entityIds: [], pointIds: [p3.id, p4.id] })
    store.addConstraint({ type: 'vertical', entityIds: [], pointIds: [p1.id, p4.id] })
    store.addConstraint({ type: 'vertical', entityIds: [], pointIds: [p2.id, p3.id] })

    rectToolReset()
  }
}

export function rectToolMove(u: number, v: number) {
  const store = useSketchStore.getState()
  const [su, sv] = store.snapToGrid(u, v)

  if (state.firstCorner !== null) {
    const [x1, y1] = state.firstCorner
    store.setPreviewPoints([
      [x1, y1],
      [su, y1],
      [su, sv],
      [x1, sv],
      [x1, y1], // close the rect
    ])
  }
}
