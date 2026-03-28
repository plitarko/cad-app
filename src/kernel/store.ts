import { create } from 'zustand'
import type { TessellationData, ShapeRef } from '../engine/types'

export type ToolMode = 'select' | 'box' | 'cylinder' | 'sphere' | 'sketch' | 'extrude' | 'fillet' | 'chamfer'
export type AppMode = 'model' | 'sketch'

export interface Feature {
  id: string
  type: string
  name: string
  params: Record<string, unknown>
  shapeRef?: ShapeRef
  suppressed?: boolean
}

export interface AppState {
  // Engine loading
  engineReady: boolean
  engineError: string | null
  setEngineReady: (ready: boolean) => void
  setEngineError: (error: string | null) => void

  // Mode
  appMode: AppMode
  setAppMode: (mode: AppMode) => void

  // Active tool
  activeTool: ToolMode
  setActiveTool: (tool: ToolMode) => void

  // Features
  features: Feature[]
  addFeature: (feature: Feature) => void
  updateFeature: (id: string, updates: Partial<Feature>) => void
  removeFeature: (id: string) => void
  selectedFeatureId: string | null
  setSelectedFeatureId: (id: string | null) => void

  // Current tessellation for display
  currentTessellation: TessellationData | null
  setCurrentTessellation: (t: TessellationData | null) => void
  currentShapeRef: ShapeRef | null
  setCurrentShapeRef: (ref: ShapeRef | null) => void

  // Selection
  selectedFaceIndices: number[]
  selectedEdgeIndices: number[]
  setSelectedFaceIndices: (indices: number[]) => void
  setSelectedEdgeIndices: (indices: number[]) => void
  hoveredFaceIndex: number | null
  setHoveredFaceIndex: (index: number | null) => void

  // Undo/redo
  undoStack: Feature[][]
  redoStack: Feature[][]
  pushUndo: () => void
  undo: () => void
  redo: () => void

  // Sketch state
  activeSketchId: string | null
  setActiveSketchId: (id: string | null) => void

  // Drag state
  isDraggingExtrude: boolean
  setIsDraggingExtrude: (v: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  engineReady: false,
  engineError: null,
  setEngineReady: (ready) => set({ engineReady: ready }),
  setEngineError: (error) => set({ engineError: error }),

  appMode: 'model',
  setAppMode: (mode) => set({ appMode: mode }),

  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  features: [],
  addFeature: (feature) => {
    const state = get()
    state.pushUndo()
    set({ features: [...state.features, feature], redoStack: [] })
  },
  updateFeature: (id, updates) => {
    const state = get()
    state.pushUndo()
    set({
      features: state.features.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      redoStack: [],
    })
  },
  removeFeature: (id) => {
    const state = get()
    state.pushUndo()
    set({
      features: state.features.filter((f) => f.id !== id),
      redoStack: [],
    })
  },
  selectedFeatureId: null,
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),

  currentTessellation: null,
  setCurrentTessellation: (t) => set({ currentTessellation: t }),
  currentShapeRef: null,
  setCurrentShapeRef: (ref) => set({ currentShapeRef: ref }),

  selectedFaceIndices: [],
  selectedEdgeIndices: [],
  setSelectedFaceIndices: (indices) => set({ selectedFaceIndices: indices }),
  setSelectedEdgeIndices: (indices) => set({ selectedEdgeIndices: indices }),
  hoveredFaceIndex: null,
  setHoveredFaceIndex: (index) => set({ hoveredFaceIndex: index }),

  undoStack: [],
  redoStack: [],
  pushUndo: () => {
    const { features, undoStack } = get()
    set({ undoStack: [...undoStack, features] })
  },
  undo: () => {
    const { undoStack, features, redoStack } = get()
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    set({
      undoStack: undoStack.slice(0, -1),
      features: prev,
      redoStack: [...redoStack, features],
    })
  },
  redo: () => {
    const { redoStack, features, undoStack } = get()
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    set({
      redoStack: redoStack.slice(0, -1),
      features: next,
      undoStack: [...undoStack, features],
    })
  },

  activeSketchId: null,
  setActiveSketchId: (id) => set({ activeSketchId: id }),

  isDraggingExtrude: false,
  setIsDraggingExtrude: (v) => set({ isDraggingExtrude: v }),
}))
