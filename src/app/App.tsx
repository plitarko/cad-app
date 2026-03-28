import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '../kernel/store'
import { LoadingScreen } from '../ui/LoadingScreen'
import { Toolbar } from '../ui/Toolbar'
import { FeatureTreePanel } from '../ui/FeatureTreePanel'
import { PropertiesPanel } from '../ui/PropertiesPanel'
import { StatusBar } from '../ui/StatusBar'
import { ExtrudeDialog } from '../ui/ExtrudeDialog'
import { Viewport } from '../viewport/Viewport'
import type { Sketch, Workplane } from '../sketch/entities'

export function App() {
  const engineReady = useAppStore((s) => s.engineReady)
  const engineError = useAppStore((s) => s.engineError)
  const setEngineReady = useAppStore((s) => s.setEngineReady)
  const setEngineError = useAppStore((s) => s.setEngineError)
  const [extrudeSketch, setExtrudeSketch] = useState<Sketch | null>(null)

  const handleLoaded = useCallback(() => setEngineReady(true), [setEngineReady])
  const handleError = useCallback((err: string) => setEngineError(err), [setEngineError])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          useAppStore.getState().redo()
        } else {
          useAppStore.getState().undo()
        }
      }
      if (e.key === 'Escape') {
        const { appMode, setAppMode } = useAppStore.getState()
        if (appMode === 'sketch') {
          setAppMode('model')
        }
        setExtrudeSketch(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleRequestExtrude = useCallback((sketchFeatureId: string) => {
    const feature = useAppStore.getState().features.find((f) => f.id === sketchFeatureId)
    if (!feature || feature.type !== 'sketch') return

    // Reconstruct sketch from params
    const params = feature.params as {
      workplane: Workplane
      points: Record<string, any>
      entities: Record<string, any>
      constraints: Record<string, any>
    }
    const sketch: Sketch = {
      id: feature.id,
      points: new Map(Object.entries(params.points)),
      entities: new Map(Object.entries(params.entities)),
      constraints: new Map(Object.entries(params.constraints)),
      workplane: params.workplane,
    }
    setExtrudeSketch(sketch)
  }, [])

  if (engineError) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f172a',
        color: '#ef4444',
        fontFamily: 'system-ui',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Failed to load CAD engine</div>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>{engineError}</div>
      </div>
    )
  }

  if (!engineReady) {
    return <LoadingScreen onLoaded={handleLoaded} onError={handleError} />
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <Toolbar onRequestExtrude={handleRequestExtrude} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <FeatureTreePanel />
        <div style={{ flex: 1, position: 'relative' }}>
          <Viewport />
          {extrudeSketch && (
            <ExtrudeDialog sketch={extrudeSketch} onClose={() => setExtrudeSketch(null)} />
          )}
        </div>
        <PropertiesPanel />
      </div>
      <StatusBar />
    </div>
  )
}
