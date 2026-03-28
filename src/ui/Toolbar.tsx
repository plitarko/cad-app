import { useAppStore, type ToolMode } from '../kernel/store'
import { useSketchStore, type SketchToolType } from '../sketch/sketch-engine'
import { WORKPLANE_XY, WORKPLANE_XZ, WORKPLANE_YZ } from '../sketch/entities'
import { occApi } from '../engine/occ-api'
import { lineToolReset } from '../sketch/tools/line-tool'
import { rectToolReset } from '../sketch/tools/rect-tool'
import { circleToolReset } from '../sketch/tools/circle-tool'

const modelTools: { mode: ToolMode; label: string; icon: string }[] = [
  { mode: 'select', label: 'Select', icon: '↖' },
  { mode: 'box', label: 'Box', icon: '◻' },
  { mode: 'cylinder', label: 'Cylinder', icon: '○' },
  { mode: 'sphere', label: 'Sphere', icon: '●' },
]

const sketchTools: { mode: SketchToolType; label: string; icon: string }[] = [
  { mode: 'select', label: 'Select', icon: '↖' },
  { mode: 'line', label: 'Line', icon: '/' },
  { mode: 'rect', label: 'Rectangle', icon: '▭' },
  { mode: 'circle', label: 'Circle', icon: '◎' },
]

interface ToolbarProps {
  onRequestExtrude?: (sketchFeatureId: string) => void
}

export function Toolbar({ onRequestExtrude }: ToolbarProps) {
  const appMode = useAppStore((s) => s.appMode)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const activeTool = useAppStore((s) => s.activeTool)
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const addFeature = useAppStore((s) => s.addFeature)
  const setCurrentTessellation = useAppStore((s) => s.setCurrentTessellation)
  const setCurrentShapeRef = useAppStore((s) => s.setCurrentShapeRef)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const selectedFeatureId = useAppStore((s) => s.selectedFeatureId)
  const features = useAppStore((s) => s.features)

  const sketchTool = useSketchStore((s) => s.activeTool)
  const setSketchTool = useSketchStore((s) => s.setTool)
  const startSketch = useSketchStore((s) => s.startSketch)
  const finishSketch = useSketchStore((s) => s.finishSketch)

  const handleCreatePrimitive = async (type: 'box' | 'cylinder' | 'sphere') => {
    let result
    const id = crypto.randomUUID()

    switch (type) {
      case 'box':
        result = await occApi.createBox(5, 5, 5)
        addFeature({ id, type: 'box', name: `Box ${id.slice(0, 4)}`, params: { width: 5, height: 5, depth: 5 }, shapeRef: result.shapeRef })
        break
      case 'cylinder':
        result = await occApi.createCylinder(2.5, 5)
        addFeature({ id, type: 'cylinder', name: `Cylinder ${id.slice(0, 4)}`, params: { radius: 2.5, height: 5 }, shapeRef: result.shapeRef })
        break
      case 'sphere':
        result = await occApi.createSphere(3)
        addFeature({ id, type: 'sphere', name: `Sphere ${id.slice(0, 4)}`, params: { radius: 3 }, shapeRef: result.shapeRef })
        break
    }

    if (result) {
      setCurrentTessellation(result.tessellation)
      setCurrentShapeRef(result.shapeRef)
    }
  }

  const handleStartSketch = (plane: 'xy' | 'xz' | 'yz') => {
    const workplanes = { xy: WORKPLANE_XY, xz: WORKPLANE_XZ, yz: WORKPLANE_YZ }
    startSketch(workplanes[plane])
    setAppMode('sketch')
  }

  const handleFinishSketch = () => {
    const sketch = finishSketch()
    if (sketch && sketch.entities.size > 0) {
      addFeature({
        id: sketch.id,
        type: 'sketch',
        name: `Sketch ${sketch.id.slice(0, 4)}`,
        params: {
          workplane: sketch.workplane,
          points: Object.fromEntries(sketch.points),
          entities: Object.fromEntries(sketch.entities),
          constraints: Object.fromEntries(sketch.constraints),
        },
      })
    }
    setAppMode('model')
  }

  const handleSetSketchTool = (tool: SketchToolType) => {
    lineToolReset()
    rectToolReset()
    circleToolReset()
    setSketchTool(tool)
  }

  const handleExport = async () => {
    const shapeRef = useAppStore.getState().currentShapeRef
    if (shapeRef == null) return
    const buffer = await occApi.exportSTL(shapeRef)
    const blob = new Blob([buffer], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'model.stl'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 12px',
      background: '#0f172a',
      borderBottom: '1px solid #1e293b',
    }}>
      {appMode === 'model' ? (
        <>
          {modelTools.map((tool) => (
            <button
              key={tool.mode}
              onClick={() => {
                setActiveTool(tool.mode)
                if (tool.mode !== 'select') {
                  handleCreatePrimitive(tool.mode as 'box' | 'cylinder' | 'sphere')
                }
              }}
              style={{
                ...btnStyle,
                background: activeTool === tool.mode ? '#3b82f6' : '#1e293b',
              }}
              title={tool.label}
            >
              <span style={{ fontSize: 16 }}>{tool.icon}</span>
              {tool.label}
            </button>
          ))}

          <div style={dividerStyle} />

          {/* Sketch starters */}
          <button onClick={() => handleStartSketch('xy')} style={btnStyle} title="Sketch on XY plane">
            Sketch XY
          </button>
          <button onClick={() => handleStartSketch('xz')} style={btnStyle} title="Sketch on XZ plane">
            Sketch XZ
          </button>
          <button onClick={() => handleStartSketch('yz')} style={btnStyle} title="Sketch on YZ plane">
            Sketch YZ
          </button>

          <div style={dividerStyle} />

          {/* 3D Operations */}
          <button
            onClick={() => {
              if (selectedFeatureId && onRequestExtrude) {
                const f = features.find((f) => f.id === selectedFeatureId)
                if (f?.type === 'sketch') onRequestExtrude(selectedFeatureId)
              }
            }}
            style={{
              ...btnStyle,
              opacity: features.some((f) => f.id === selectedFeatureId && f.type === 'sketch') ? 1 : 0.4,
            }}
            title="Extrude selected sketch"
          >
            Extrude
          </button>

          <div style={dividerStyle} />

          <button onClick={undo} style={btnStyle} title="Undo (Ctrl+Z)">Undo</button>
          <button onClick={redo} style={btnStyle} title="Redo (Ctrl+Shift+Z)">Redo</button>

          <div style={{ flex: 1 }} />

          <button onClick={handleExport} style={{ ...btnStyle, background: '#16a34a' }}>
            Export STL
          </button>
        </>
      ) : (
        <>
          {sketchTools.map((tool) => (
            <button
              key={tool.mode}
              onClick={() => handleSetSketchTool(tool.mode)}
              style={{
                ...btnStyle,
                background: sketchTool === tool.mode ? '#3b82f6' : '#1e293b',
              }}
              title={tool.label}
            >
              <span style={{ fontSize: 16 }}>{tool.icon}</span>
              {tool.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            onClick={handleFinishSketch}
            style={{ ...btnStyle, background: '#16a34a' }}
          >
            Finish Sketch
          </button>
          <button
            onClick={() => { finishSketch(); setAppMode('model') }}
            style={{ ...btnStyle, background: '#dc2626' }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: '#1e293b',
  color: '#e2e8f0',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 24,
  background: '#334155',
  margin: '0 8px',
}
