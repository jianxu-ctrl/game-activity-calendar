import { DB_NAME, DB_STORE, LEGACY_CACHE_KEYS, LEGACY_DB_NAMES } from "../constants";

export function readStorage(key: string, fallback: unknown) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function readStorageWithFallback(primaryKey: string, legacyKeyName: string, fallback: unknown) {
  const primary = readStorage(primaryKey, null);
  if (primary !== null) return primary;
  for (const legacy of LEGACY_CACHE_KEYS) {
    const value = readStorage((legacy as any)[legacyKeyName], null);
    if (value !== null) return value;
  }
  return fallback;
}

export function readRawWithFallback(primaryKey: string, legacyKeyName: string, fallback: string) {
  const primary = localStorage.getItem(primaryKey);
  if (primary) return primary;
  for (const legacy of LEGACY_CACHE_KEYS) {
    const value = localStorage.getItem((legacy as any)[legacyKeyName]);
    if (value) return value;
  }
  return fallback;
}

export function safeWriteStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Larger data lives in IndexedDB.
  }
}

export function openDB(dbName: string = DB_NAME) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported by this browser."));
      return;
    }

    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
  });
}

export async function dbPut(key: string, value: unknown) {
  const db = await openDB(DB_NAME);
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Failed to write cache."));
    };
  });
}

export async function dbGet(key: string, dbName: string = DB_NAME) {
  const db = await openDB(dbName);
  return new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(key);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("Failed to read cache."));
    };
  });
}

export async function dbGetWithLegacy(key: string) {
  const current = await dbGet(key, DB_NAME).catch(() => null);
  if (current) return current;

  for (const dbName of LEGACY_DB_NAMES) {
    const legacy = await dbGet(key, dbName).catch(() => null);
    if (legacy) return legacy;
  }
  return null;
}

export async function cacheFile(key: string, file: File) {
  const buffer = await file.arrayBuffer();
  const record = {
    name: file.name,
    size: file.size,
    type: file.type || "",
    updatedAt: Date.now(),
    buffer,
  };
  await dbPut(`file:${key}`, record);
  return record;
}

export function loadCachedFile(key: string) {
  return dbGetWithLegacy(`file:${key}`);
}

export function saveTranslationMap(language: string, map: Record<string, unknown>) {
  return dbPut(`translation:${language}`, map || {});
}

export async function loadTranslationMap(language: string) {
  const fromIndexedDB = await dbGetWithLegacy(`translation:${language}`).catch(() => null);
  if (fromIndexedDB) return fromIndexedDB as Record<string, unknown>;

  const legacyMaps = [
    readStorage("event_calendar_translation_maps_v9", null),
    readStorage("event_calendar_translation_maps_v8", null),
    readStorage("event_calendar_translation_maps_v7", null),
    readStorage("event_calendar_translation_maps_v6", null),
    readStorage("event_calendar_translation_maps_v5", null),
    readStorage("event_calendar_translation_maps_v4", null),
    readStorage("event_calendar_translation_maps_v3", null),
    readStorage("event_calendar_translation_maps_v2", null),
    readStorage("event_calendar_translation_maps", null),
  ].find((maps) => maps && typeof maps === "object");
  return (legacyMaps && (legacyMaps as Record<string, unknown>)[language]) || {};
}
