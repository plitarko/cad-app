export interface SketchPoint {
  id: string
  x: number
  y: number
  fixed?: boolean
}

export interface SketchLine {
  id: string
  type: 'line'
  startId: string
  endId: string
}

export interface SketchCircle {
  id: string
  type: 'circle'
  centerId: string
  radius: number
}

export interface SketchArc {
  id: string
  type: 'arc'
  centerId: string
  startId: string
  endId: string
  radius: number
}

export interface SketchRect {
  id: string
  type: 'rect'
  lineIds: [string, string, string, string]
}

export type SketchEntity = SketchLine | SketchCircle | SketchArc

export type ConstraintType =
  | 'coincident'
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'distance'
  | 'angle'
  | 'tangent'
  | 'equal'
  | 'fixed'

export interface SketchConstraint {
  id: string
  type: ConstraintType
  entityIds: string[]
  pointIds: string[]
  value?: number
}

export interface Sketch {
  id: string
  points: Map<string, SketchPoint>
  entities: Map<string, SketchEntity>
  constraints: Map<string, SketchConstraint>
  workplane: Workplane
}

export interface Workplane {
  origin: [number, number, number]
  normal: [number, number, number]
  xAxis: [number, number, number]
  yAxis: [number, number, number]
}

export const WORKPLANE_XY: Workplane = {
  origin: [0, 0, 0],
  normal: [0, 0, 1],
  xAxis: [1, 0, 0],
  yAxis: [0, 1, 0],
}

export const WORKPLANE_XZ: Workplane = {
  origin: [0, 0, 0],
  normal: [0, 1, 0],
  xAxis: [1, 0, 0],
  yAxis: [0, 0, -1],
}

export const WORKPLANE_YZ: Workplane = {
  origin: [0, 0, 0],
  normal: [1, 0, 0],
  xAxis: [0, 1, 0],
  yAxis: [0, 0, 1],
}

export function pointToWorld(wp: Workplane, u: number, v: number): [number, number, number] {
  return [
    wp.origin[0] + u * wp.xAxis[0] + v * wp.yAxis[0],
    wp.origin[1] + u * wp.xAxis[1] + v * wp.yAxis[1],
    wp.origin[2] + u * wp.xAxis[2] + v * wp.yAxis[2],
  ]
}

export function worldToPlane(wp: Workplane, x: number, y: number, z: number): [number, number] {
  const dx = x - wp.origin[0]
  const dy = y - wp.origin[1]
  const dz = z - wp.origin[2]
  const u = dx * wp.xAxis[0] + dy * wp.xAxis[1] + dz * wp.xAxis[2]
  const v = dx * wp.yAxis[0] + dy * wp.yAxis[1] + dz * wp.yAxis[2]
  return [u, v]
}
