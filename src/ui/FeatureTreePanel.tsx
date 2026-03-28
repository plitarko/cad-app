import { useAppStore } from '../kernel/store'

const typeIcons: Record<string, string> = {
  box: '◻',
  cylinder: '○',
  sphere: '●',
  sketch: '✏',
  extrude: '⬆',
  fillet: '◠',
  chamfer: '◇',
}

export function FeatureTreePanel() {
  const features = useAppStore((s) => s.features)
  const selectedFeatureId = useAppStore((s) => s.selectedFeatureId)
  const setSelectedFeatureId = useAppStore((s) => s.setSelectedFeatureId)
  const removeFeature = useAppStore((s) => s.removeFeature)

  return (
    <div style={{
      width: 240,
      background: '#0f172a',
      borderRight: '1px solid #1e293b',
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
        Feature Tree
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {features.length === 0 ? (
          <div style={{ padding: 12, color: '#475569', fontSize: 13 }}>
            No features yet. Use the toolbar to create primitives.
          </div>
        ) : (
          features.map((feature, index) => (
            <div
              key={feature.id}
              onClick={() => setSelectedFeatureId(feature.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                if (confirm(`Delete "${feature.name}"?`)) {
                  removeFeature(feature.id)
                }
              }}
              style={{
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                background: selectedFeatureId === feature.id ? '#1e293b' : 'transparent',
                borderLeft: selectedFeatureId === feature.id ? '2px solid #3b82f6' : '2px solid transparent',
                fontSize: 13,
                color: feature.suppressed ? '#475569' : '#e2e8f0',
                textDecoration: feature.suppressed ? 'line-through' : 'none',
              }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>
                {typeIcons[feature.type] || '?'}
              </span>
              <span style={{ flex: 1 }}>{feature.name}</span>
              <span style={{ fontSize: 11, color: '#475569' }}>#{index + 1}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
