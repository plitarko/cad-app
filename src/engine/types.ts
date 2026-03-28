export interface TessellationData {
  faces: FaceTessellation[]
  edges: EdgeTessellation[]
}

export interface FaceTessellation {
  faceIndex: number
  vertices: Float32Array
  normals: Float32Array
  indices: Uint32Array
}

export interface EdgeTessellation {
  edgeIndex: number
  points: Float32Array
}

export type ShapeRef = number

export interface WorkerRequest {
  id: number
  method: string
  args: unknown[]
}

export interface WorkerResponse {
  id: number
  result?: unknown
  error?: string
  progress?: number
}
