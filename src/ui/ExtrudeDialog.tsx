import { useState } from 'react'
import { useAppStore } from '../kernel/store'
import { occApi } from '../engine/occ-api'
import { sketchToEdges } from '../kernel/operations/sketch-to-face'
import type { Sketch } from '../sketch/entities'

interface ExtrudeDialogProps {
  sketch: Sketch
  onClose: () => void
}

export function ExtrudeDialog({ sketch, onClose }: ExtrudeDialogProps) {
  const [depth, setDepth] = useState(5)
  const [operation, setOperation] = useState<'new' | 'fuse' | 'cut'>('new')
  const [loading, setLoading] = useState(false)

  const addFeature = useAppStore((s) => s.addFeature)
  const setCurrentTessellation = useAppStore((s) => s.setCurrentTessellation)
  const setCurrentShapeRef = useAppStore((s) => s.setCurrentShapeRef)
  const currentShapeRef = useAppStore((s) => s.currentShapeRef)

  const handleExtrude = async () => {
    setLoading(true)
    try {
      const edges = sketchToEdges(sketch)
      if (edges.length === 0) {
        alert('Sketch has no edges to extrude')
        return
      }

      const result = await occApi.extrudeSketch(
        edges,
        depth,
        sketch.workplane.origin,
        sketch.workplane.normal,
        sketch.workplane.xAxis,
        operation,
        operation !== 'new' ? currentShapeRef ?? undefined : undefined,
      )

      const id = crypto.randomUUID()
      addFeature({
        id,
        type: 'extrude',
        name: `Extrude ${id.slice(0, 4)}`,
        params: { depth, operation, sketchId: sketch.id },
        shapeRef: result.shapeRef,
      })
      setCurrentTessellation(result.tessellation)
      setCurrentShapeRef(result.shapeRef)
      onClose()
    } catch (err: any) {
      alert(`Extrude failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: 8,
      padding: 16,
      zIndex: 100,
      width: 280,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
        Extrude
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Depth (mm)</label>
        <input
          type="number"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          step={0.5}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Operation</label>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value as 'new' | 'fuse' | 'cut')}
          style={inputStyle}
        >
          <option value="new">New Body</option>
          <option value="fuse">Add (Fuse)</option>
          <option value="cut">Remove (Cut)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleExtrude}
          disabled={loading}
          style={{ ...btnStyle, background: '#3b82f6', flex: 1 }}
        >
          {loading ? 'Extruding...' : 'Extrude'}
        </button>
        <button onClick={onClose} style={{ ...btnStyle, flex: 1 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  display: 'block',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 4,
  color: '#e2e8f0',
  fontSize: 13,
}

const btnStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#1e293b',
  color: '#e2e8f0',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
}
