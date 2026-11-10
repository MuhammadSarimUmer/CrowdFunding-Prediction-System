import { DB_VERSION, createSeedDatabase, type MockDatabase } from './seed';

const DB_KEY = 'cp_mock_db_v1';

let memoryDb: MockDatabase | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function loadDb(): MockDatabase {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDatabase;
      if (parsed.version === DB_VERSION) {
        memoryDb = parsed;
        return parsed;
      }
    }
  } catch {
    // fall through to a fresh seed
  }
  memoryDb = createSeedDatabase();
  persistDb();
  return memoryDb;
}

export function persistDb(): void {
  if (!memoryDb) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(memoryDb));
  } catch {
    // ignore quota errors
  }
}

export function resetDb(): MockDatabase {
  memoryDb = createSeedDatabase();
  persistDb();
  return memoryDb;
}

export function nextId(kind: keyof MockDatabase['counters']): number {
  const db = loadDb();
  db.counters[kind] += 1;
  return db.counters[kind];
}

export function snapshotDb(): MockDatabase {
  return clone(loadDb());
}
