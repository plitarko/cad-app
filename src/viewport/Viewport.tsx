import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewcube, Environment } from '@react-three/drei'
import { useAppStore } from '../kernel/store'
import { useSketchStore } from '../sketch/sketch-engine'
import { ShapeMesh } from './ShapeMesh'
import { EdgeOverlay } from './EdgeOverlay'
import { SketchOverlay } from './SketchOverlay'
import { WorkplaneHelper } from './WorkplaneHelper'
import { SketchFeatureView } from './SketchFeatureView'
import { ExtrudeArrow } from './ExtrudeArrow'
import type { Workplane, SketchPoint } from '../sketch/entities'

interface ViewportProps {
  onRequestExtrude?: (sketchFeatureId: string) => void
}

export function Viewport({ onRequestExtrude }: ViewportProps) {
  const tessellation = useAppStore((s) => s.currentTessellation)
  const appMode = useAppStore((s) => s.appMode)
  const activeSketch = useSketchStore((s) => s.activeSketch)
  const features = useAppStore((s) => s.features)
  const selectedFeatureId = useAppStore((s) => s.selectedFeatureId)

  return (
    <Canvas
      camera={{ position: [10, 8, 10], fov: 50, near: 0.1, far: 1000 }}
      style={{ background: '#1e293b' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 10]} intensity={0.8} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {appMode !== 'sketch' && (
        <Grid
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#475569"
          fadeDistance={50}
          infiniteGrid
        />
      )}

      <axesHelper args={[5]} />

      {tessellation && (
        <>
          <ShapeMesh tessellation={tessellation} />
          <EdgeOverlay tessellation={tessellation} />
        </>
      )}

      {/* Render completed sketches in model mode */}
      {appMode === 'model' && features
        .filter((f) => f.type === 'sketch')
        .map((f) => (
          <SketchFeatureView
            key={f.id}
            feature={f}
            isSelected={f.id === selectedFeatureId}
          />
        ))
      }

      {/* Extrude arrow on selected sketch */}
      {appMode === 'model' && selectedFeatureId && (() => {
        const selectedFeature = features.find((f) => f.id === selectedFeatureId)
        if (!selectedFeature || selectedFeature.type !== 'sketch') return null
        const params = selectedFeature.params as {
          workplane: Workplane
          points: Record<string, SketchPoint>
        }
        return (
          <ExtrudeArrow
            workplane={params.workplane}
            points={params.points}
            onClick={() => onRequestExtrude?.(selectedFeatureId)}
          />
        )
      })()}

      {appMode === 'sketch' && activeSketch && (
        <>
          <WorkplaneHelper workplane={activeSketch.workplane} />
          <SketchOverlay workplane={activeSketch.workplane} />
        </>
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        enabled={appMode !== 'sketch'}
        mouseButtons={{
          LEFT: 0,
          MIDDLE: 2,
          RIGHT: 2,
        }}
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewcube />
      </GizmoHelper>

      <Environment preset="city" background={false} />
    </Canvas>
  )
}
