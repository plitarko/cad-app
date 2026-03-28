import { useAppStore } from '../kernel/store'
import { useSketchStore } from '../sketch/sketch-engine'

export function StatusBar() {
  const appMode = useAppStore((s) => s.appMode)
  const activeTool = useAppStore((s) => s.activeTool)
  const features = useAppStore((s) => s.features)
  const hoveredFaceIndex = useAppStore((s) => s.hoveredFaceIndex)

  const sketchTool = useSketchStore((s) => s.activeTool)
  const activeSketch = useSketchStore((s) => s.activeSketch)
  const snapPoint = useSketchStore((s) => s.snapPoint)

  return (
    <div style={{
      height: 28,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      background: '#0f172a',
      borderTop: '1px solid #1e293b',
      fontSize: 12,
      color: '#64748b',
      gap: 16,
    }}>
      <span>Mode: {appMode}</span>
      {appMode === 'model' ? (
        <>
          <span>Tool: {activeTool}</span>
          <span>Features: {features.length}</span>
          {hoveredFaceIndex != null && <span>Face: #{hoveredFaceIndex}</span>}
        </>
      ) : (
        <>
          <span>Tool: {sketchTool}</span>
          {activeSketch && (
            <>
              <span>Points: {activeSketch.points.size}</span>
              <span>Entities: {activeSketch.entities.size}</span>
              <span>Constraints: {activeSketch.constraints.size}</span>
            </>
          )}
          {snapPoint && <span>Snap: ({snapPoint[0].toFixed(1)}, {snapPoint[1].toFixed(1)})</span>}
        </>
      )}
    </div>
  )
}
