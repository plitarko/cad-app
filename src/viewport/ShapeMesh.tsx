import { useMemo } from 'react'
import * as THREE from 'three'
import type { TessellationData } from '../engine/types'
import { useAppStore } from '../kernel/store'

interface ShapeMeshProps {
  tessellation: TessellationData
}

export function ShapeMesh({ tessellation }: ShapeMeshProps) {
  const hoveredFaceIndex = useAppStore((s) => s.hoveredFaceIndex)
  const setHoveredFaceIndex = useAppStore((s) => s.setHoveredFaceIndex)
  const selectedFaceIndices = useAppStore((s) => s.selectedFaceIndices)
  const setSelectedFaceIndices = useAppStore((s) => s.setSelectedFaceIndices)

  return (
    <group>
      {tessellation.faces.map((face) => (
        <FaceMesh
          key={face.faceIndex}
          face={face}
          isHovered={hoveredFaceIndex === face.faceIndex}
          isSelected={selectedFaceIndices.includes(face.faceIndex)}
          onHover={(hovered) => setHoveredFaceIndex(hovered ? face.faceIndex : null)}
          onSelect={() => {
            setSelectedFaceIndices(
              selectedFaceIndices.includes(face.faceIndex)
                ? selectedFaceIndices.filter((i) => i !== face.faceIndex)
                : [face.faceIndex]
            )
          }}
        />
      ))}
    </group>
  )
}

interface FaceMeshProps {
  face: TessellationData['faces'][0]
  isHovered: boolean
  isSelected: boolean
  onHover: (hovered: boolean) => void
  onSelect: () => void
}

function FaceMesh({ face, isHovered, isSelected, onHover, onSelect }: FaceMeshProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(face.vertices, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(face.normals, 3))
    geo.setIndex(new THREE.BufferAttribute(face.indices, 1))
    return geo
  }, [face])

  const color = isSelected ? '#3b82f6' : isHovered ? '#f97316' : '#94a3b8'

  return (
    <mesh
      geometry={geometry}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true) }}
      onPointerOut={() => onHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      <meshStandardMaterial
        color={color}
        metalness={0.2}
        roughness={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
