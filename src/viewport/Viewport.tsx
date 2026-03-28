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
import type { Workplane, SketchPoint, Sketch } from '../sketch/entities'
import { sketchToEdges } from '../kernel/operations/sketch-to-face'
import { occApi } from '../engine/occ-api'

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
          entities: Record<string, any>
          constraints: Record<string, any>
        }
        return (
          <ExtrudeArrow
            workplane={params.workplane}
            points={params.points}
            onExtrude={async (depth: number) => {
              const sketch: Sketch = {
                id: selectedFeature.id,
                points: new Map(Object.entries(params.points)),
                entities: new Map(Object.entries(params.entities)),
                constraints: new Map(Object.entries(params.constraints)),
                workplane: params.workplane,
              }
              const edges = sketchToEdges(sketch)
              if (edges.length === 0) return
              try {
                const currentShapeRef = useAppStore.getState().currentShapeRef
                const result = await occApi.extrudeSketch(
                  edges,
                  depth,
                  sketch.workplane.origin,
                  sketch.workplane.normal,
                  sketch.workplane.xAxis,
                  currentShapeRef != null ? 'fuse' : 'new',
                  currentShapeRef ?? undefined,
                )
                const id = crypto.randomUUID()
                useAppStore.getState().addFeature({
                  id,
                  type: 'extrude',
                  name: `Extrude ${id.slice(0, 4)}`,
                  params: { depth, sketchId: selectedFeature.id },
                  shapeRef: result.shapeRef,
                })
                useAppStore.getState().setCurrentTessellation(result.tessellation)
                useAppStore.getState().setCurrentShapeRef(result.shapeRef)
              } catch (err: any) {
                console.error('Extrude failed:', err)
              }
            }}
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
