import { useAppStore } from '../kernel/store'

export function PropertiesPanel() {
  const selectedFeatureId = useAppStore((s) => s.selectedFeatureId)
  const features = useAppStore((s) => s.features)
  const selectedFaceIndices = useAppStore((s) => s.selectedFaceIndices)
  const selectedEdgeIndices = useAppStore((s) => s.selectedEdgeIndices)

  const feature = features.find((f) => f.id === selectedFeatureId)

  return (
    <div style={{
      width: 260,
      background: '#0f172a',
      borderLeft: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 12px',
        fontSize: 12,
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        borderBottom: '1px solid #1e293b',
      }}>
        Properties
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {feature ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
              {feature.name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              Type: {feature.type}
            </div>
            {Object.entries(feature.params).map(([key, value]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 2 }}>
                  {key}
                </label>
                <input
                  type="number"
                  value={value as number}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 4,
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#475569', fontSize: 13 }}>
            {selectedFaceIndices.length > 0 ? (
              <div>Selected face: #{selectedFaceIndices[0]}</div>
            ) : selectedEdgeIndices.length > 0 ? (
              <div>Selected edge: #{selectedEdgeIndices[0]}</div>
            ) : (
              <div>Select a feature or face to see properties.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
