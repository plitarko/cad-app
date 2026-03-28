/// <reference lib="webworker" />
import type { TessellationData, FaceTessellation, EdgeTessellation, ShapeRef } from './types'

let oc: any
const shapes = new Map<ShapeRef, unknown>()
let nextShapeId = 1

function allocShape(shape: unknown): ShapeRef {
  const id = nextShapeId++
  shapes.set(id, shape)
  return id
}

function getShape(ref: ShapeRef): any {
  const s = shapes.get(ref)
  if (!s) throw new Error(`Shape ${ref} not found`)
  return s
}

function tessellate(shapeRef: ShapeRef, deflection = 0.1): TessellationData {
  const shape = getShape(shapeRef)

  new oc.BRepMesh_IncrementalMesh_2(shape, deflection, false, 0.5, false)

  const faces: FaceTessellation[] = []
  const edges: EdgeTessellation[] = []

  // Extract faces
  const faceExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE)
  let faceIndex = 0
  while (faceExplorer.More()) {
    const face = oc.TopoDS.Face_1(faceExplorer.Current())
    const location = new oc.TopLoc_Location_1()
    const triangulation = oc.BRep_Tool.Triangulation(face, location)

    if (!triangulation.IsNull()) {
      const tri = triangulation.get()
      const nbNodes = tri.NbNodes()
      const nbTriangles = tri.NbTriangles()

      const vertices = new Float32Array(nbNodes * 3)
      const normals = new Float32Array(nbNodes * 3)
      const indices = new Uint32Array(nbTriangles * 3)

      const transform = location.Transformation()

      for (let i = 1; i <= nbNodes; i++) {
        const node = tri.Node(i)
        const transformed = node.Transformed(transform)
        vertices[(i - 1) * 3] = transformed.X()
        vertices[(i - 1) * 3 + 1] = transformed.Y()
        vertices[(i - 1) * 3 + 2] = transformed.Z()
      }

      // Compute normals from triangles
      const normalAccum = new Float32Array(nbNodes * 3)
      const normalCount = new Uint32Array(nbNodes)

      const orientation = face.Orientation_1()

      for (let i = 1; i <= nbTriangles; i++) {
        const triangle = tri.Triangle(i)
        let n1 = triangle.Value(1) - 1
        let n2 = triangle.Value(2) - 1
        let n3 = triangle.Value(3) - 1

        if (orientation === oc.TopAbs_Orientation.TopAbs_REVERSED) {
          [n2, n3] = [n3, n2]
        }

        const ax = vertices[n2 * 3] - vertices[n1 * 3]
        const ay = vertices[n2 * 3 + 1] - vertices[n1 * 3 + 1]
        const az = vertices[n2 * 3 + 2] - vertices[n1 * 3 + 2]
        const bx = vertices[n3 * 3] - vertices[n1 * 3]
        const by = vertices[n3 * 3 + 1] - vertices[n1 * 3 + 1]
        const bz = vertices[n3 * 3 + 2] - vertices[n1 * 3 + 2]

        const nx = ay * bz - az * by
        const ny = az * bx - ax * bz
        const nz = ax * by - ay * bx

        for (const idx of [n1, n2, n3]) {
          normalAccum[idx * 3] += nx
          normalAccum[idx * 3 + 1] += ny
          normalAccum[idx * 3 + 2] += nz
          normalCount[idx]++
        }

        indices[(i - 1) * 3] = n1
        indices[(i - 1) * 3 + 1] = n2
        indices[(i - 1) * 3 + 2] = n3
      }

      // Normalize
      for (let i = 0; i < nbNodes; i++) {
        if (normalCount[i] > 0) {
          const len = Math.sqrt(
            normalAccum[i * 3] ** 2 +
            normalAccum[i * 3 + 1] ** 2 +
            normalAccum[i * 3 + 2] ** 2
          )
          if (len > 0) {
            normals[i * 3] = normalAccum[i * 3] / len
            normals[i * 3 + 1] = normalAccum[i * 3 + 1] / len
            normals[i * 3 + 2] = normalAccum[i * 3 + 2] / len
          }
        }
      }

      faces.push({ faceIndex, vertices, normals, indices })
    }

    faceIndex++
    faceExplorer.Next()
  }

  // Extract edges
  const edgeExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE)
  let edgeIndex = 0
  while (edgeExplorer.More()) {
    const edge = oc.TopoDS.Edge_1(edgeExplorer.Current())
    const location = new oc.TopLoc_Location_1()
    const poly = oc.BRep_Tool.Polygon3D(edge, location)

    if (!poly.IsNull()) {
      const p = poly.get()
      const nbNodes = p.NbNodes()
      const points = new Float32Array(nbNodes * 3)
      const transform = location.Transformation()

      for (let i = 1; i <= nbNodes; i++) {
        const node = p.Nodes().Value(i)
        const transformed = node.Transformed(transform)
        points[(i - 1) * 3] = transformed.X()
        points[(i - 1) * 3 + 1] = transformed.Y()
        points[(i - 1) * 3 + 2] = transformed.Z()
      }

      edges.push({ edgeIndex, points })
    } else {
      // Try getting edge points from curve adaptation
      const curve = new oc.BRepAdaptor_Curve_2(edge)
      const first = curve.FirstParameter()
      const last = curve.LastParameter()
      const nbPoints = 32
      const points = new Float32Array(nbPoints * 3)

      for (let i = 0; i < nbPoints; i++) {
        const t = first + (i / (nbPoints - 1)) * (last - first)
        const pt = curve.Value(t)
        points[i * 3] = pt.X()
        points[i * 3 + 1] = pt.Y()
        points[i * 3 + 2] = pt.Z()
      }

      edges.push({ edgeIndex, points })
    }

    edgeIndex++
    edgeExplorer.Next()
  }

  return { faces, edges }
}

// --- Public API exposed to main thread ---

async function loadOpenCascade(): Promise<void> {
  // Fetch the Emscripten JS module as text, strip the ES module export,
  // and evaluate it to get the factory function
  const response = await fetch('/opencascade.wasm.js')
  let jsText = await response.text()

  // Remove the trailing `export default opencascade;` so it can be eval'd
  jsText = jsText.replace(/export\s+default\s+opencascade\s*;?\s*$/, '')

  // Wrap in a function that returns the factory
  const fn = new Function(jsText + '\nreturn opencascade;')
  const opencascadeFactory = fn()

  oc = await opencascadeFactory({
    locateFile: (file: string) => {
      if (file.endsWith('.wasm')) {
        return '/opencascade.wasm.wasm'
      }
      return '/' + file
    },
  })
}

const api = {
  async init(): Promise<string> {
    await loadOpenCascade()
    return 'OpenCascade.js loaded'
  },

  createBox(width: number, height: number, depth: number): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const box = new oc.BRepPrimAPI_MakeBox_3(width, height, depth)
    const shape = box.Shape()
    const ref = allocShape(shape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },

  createCylinder(radius: number, height: number): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const cyl = new oc.BRepPrimAPI_MakeCylinder_3(radius, height)
    const shape = cyl.Shape()
    const ref = allocShape(shape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },

  createSphere(radius: number): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const sph = new oc.BRepPrimAPI_MakeSphere_5(radius)
    const shape = sph.Shape()
    const ref = allocShape(shape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },

  tessellate(shapeRef: ShapeRef, deflection?: number): TessellationData {
    return tessellate(shapeRef, deflection)
  },

  deleteShape(shapeRef: ShapeRef): void {
    shapes.delete(shapeRef)
  },

  exportSTL(shapeRef: ShapeRef, deflection = 0.05): ArrayBuffer {
    const shape = getShape(shapeRef)
    new oc.BRepMesh_IncrementalMesh_2(shape, deflection, false, 0.5, false)

    const writer = new oc.StlAPI_Writer()
    writer.ASCIIMode = false
    const filename = '/tmp/export.stl'
    writer.Write(shape, new oc.TCollection_AsciiString_2(filename), new oc.Message_ProgressRange_1())

    const file = oc.FS.readFile(filename)
    oc.FS.unlink(filename)
    return file.buffer
  },

  // Boolean operations
  fuseShapes(refA: ShapeRef, refB: ShapeRef): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const a = getShape(refA)
    const b = getShape(refB)
    const fuse = new oc.BRepAlgoAPI_Fuse_3(a, b, new oc.Message_ProgressRange_1())
    const shape = fuse.Shape()
    const ref = allocShape(shape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },

  cutShapes(refA: ShapeRef, refB: ShapeRef): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const a = getShape(refA)
    const b = getShape(refB)
    const cut = new oc.BRepAlgoAPI_Cut_3(a, b, new oc.Message_ProgressRange_1())
    const shape = cut.Shape()
    const ref = allocShape(shape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },

  commonShapes(refA: ShapeRef, refB: ShapeRef): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const a = getShape(refA)
    const b = getShape(refB)
    const common = new oc.BRepAlgoAPI_Common_3(a, b, new oc.Message_ProgressRange_1())
    const shape = common.Shape()
    const ref = allocShape(shape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },

  extrudeSketch(
    edges: Array<{ type: 'line'; x1: number; y1: number; x2: number; y2: number } |
                  { type: 'circle'; cx: number; cy: number; radius: number } |
                  { type: 'arc'; cx: number; cy: number; radius: number; startAngle: number; endAngle: number }>,
    depth: number,
    planeOrigin: [number, number, number],
    planeNormal: [number, number, number],
    planeXAxis: [number, number, number],
    operation: 'new' | 'fuse' | 'cut',
    existingShapeRef?: ShapeRef,
  ): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const origin = new oc.gp_Pnt_3(planeOrigin[0], planeOrigin[1], planeOrigin[2])
    const normal = new oc.gp_Dir_4(planeNormal[0], planeNormal[1], planeNormal[2])
    const xDir = new oc.gp_Dir_4(planeXAxis[0], planeXAxis[1], planeXAxis[2])
    const ax2 = new oc.gp_Ax2_2(origin, normal, xDir)

    const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1()

    for (const e of edges) {
      if (e.type === 'line') {
        const p1 = pointOnPlane(ax2, e.x1, e.y1)
        const p2 = pointOnPlane(ax2, e.x2, e.y2)
        const edge = new oc.BRepBuilderAPI_MakeEdge_3(p1, p2).Edge()
        wireBuilder.Add_1(edge)
      } else if (e.type === 'circle') {
        const center = pointOnPlane(ax2, e.cx, e.cy)
        const circleAx2 = new oc.gp_Ax2_2(center, normal, xDir)
        const circle = new oc.gp_Circ_2(circleAx2, e.radius)
        const edge = new oc.BRepBuilderAPI_MakeEdge_8(circle).Edge()
        wireBuilder.Add_1(edge)
      }
    }

    const wire = wireBuilder.Wire()
    const face = new oc.BRepBuilderAPI_MakeFace_15(wire, true).Face()

    const extrudeVec = new oc.gp_Vec_4(
      normal.X() * depth,
      normal.Y() * depth,
      normal.Z() * depth
    )

    const prism = new oc.BRepPrimAPI_MakePrism_1(face, extrudeVec, false, true)
    let resultShape = prism.Shape()

    if (operation !== 'new' && existingShapeRef !== undefined) {
      const existing = getShape(existingShapeRef)
      if (operation === 'fuse') {
        const fuse = new oc.BRepAlgoAPI_Fuse_3(existing, resultShape, new oc.Message_ProgressRange_1())
        resultShape = fuse.Shape()
      } else if (operation === 'cut') {
        const cut = new oc.BRepAlgoAPI_Cut_3(existing, resultShape, new oc.Message_ProgressRange_1())
        resultShape = cut.Shape()
      }
    }

    const ref = allocShape(resultShape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },

  filletShape(shapeRef: ShapeRef, edgeIndices: number[], radius: number): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const shape = getShape(shapeRef)
    const fillet = new oc.BRepFilletAPI_MakeFillet(shape, oc.ChFi3d_FilletShape.ChFi3d_Rational)

    const edgeExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE)
    let idx = 0
    while (edgeExplorer.More()) {
      if (edgeIndices.includes(idx)) {
        const edge = oc.TopoDS.Edge_1(edgeExplorer.Current())
        fillet.Add_2(radius, edge)
      }
      idx++
      edgeExplorer.Next()
    }

    const resultShape = fillet.Shape()
    const ref = allocShape(resultShape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },

  chamferShape(shapeRef: ShapeRef, edgeIndices: number[], distance: number): { shapeRef: ShapeRef; tessellation: TessellationData } {
    const shape = getShape(shapeRef)
    const chamfer = new oc.BRepFilletAPI_MakeChamfer(shape)

    const edgeExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE)
    let idx = 0
    while (edgeExplorer.More()) {
      if (edgeIndices.includes(idx)) {
        const edge = oc.TopoDS.Edge_1(edgeExplorer.Current())
        chamfer.Add_2(distance, edge)
      }
      idx++
      edgeExplorer.Next()
    }

    const resultShape = chamfer.Shape()
    const ref = allocShape(resultShape)
    return { shapeRef: ref, tessellation: tessellate(ref) }
  },
}

function pointOnPlane(ax2: any, u: number, v: number): any {
  const origin = ax2.Location()
  const xDir = ax2.XDirection()
  const yDir = ax2.YDirection()
  return new oc.gp_Pnt_3(
    origin.X() + u * xDir.X() + v * yDir.X(),
    origin.Y() + u * xDir.Y() + v * yDir.Y(),
    origin.Z() + u * xDir.Z() + v * yDir.Z(),
  )
}

// Message-based RPC handler
self.onmessage = async (e: MessageEvent) => {
  const { id, method, args } = e.data
  try {
    const fn = (api as any)[method]
    if (!fn) throw new Error(`Unknown method: ${method}`)
    const result = await fn(...args)
    self.postMessage({ id, result })
  } catch (err: any) {
    self.postMessage({ id, error: err.message || String(err) })
  }
}
