import { openDB, type DBSchema } from 'idb'
import type { Feature } from '../kernel/store'

interface CadDB extends DBSchema {
  projects: {
    key: string
    value: {
      id: string
      name: string
      features: Feature[]
      updatedAt: number
    }
  }
}

const DB_NAME = 'cad-app'
const DB_VERSION = 1

async function getDB() {
  return openDB<CadDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
    },
  })
}

export async function saveProject(id: string, name: string, features: Feature[]) {
  const db = await getDB()
  // Strip shapeRef from features before saving (not serializable/reconstructable)
  const cleanFeatures = features.map(({ shapeRef, ...rest }) => rest)
  await db.put('projects', {
    id,
    name,
    features: cleanFeatures,
    updatedAt: Date.now(),
  })
}

export async function loadProject(id: string) {
  const db = await getDB()
  return db.get('projects', id)
}

export async function listProjects() {
  const db = await getDB()
  return db.getAll('projects')
}

export async function deleteProject(id: string) {
  const db = await getDB()
  await db.delete('projects', id)
}
