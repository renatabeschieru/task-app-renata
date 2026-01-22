// src/offlineDb.js
//idb este o bibliotecă wrapper care face IndexedDB mai ușor de utilizat
import { openDB } from "idb";

const DB_NAME = "task-app-renata";
const STORE = "offlineTasks";//tabela
const VERSION = 1;

async function getDb() {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) { //db.objectStoreNames este lista cu toate „tabelele” din baza IndexedDB
        db.createObjectStore(STORE, { keyPath: "localId" }); //Când salvezi un task în IndexedDB, el trebuie să aibă o proprietate localId, care îl identifică unic.
      }
    },
  });
}

// ✅ add in queue
export async function queueOfflineTask(task) {
  const db = await getDb();
  const localId = task.createdAtClient || Date.now();
  await db.put(STORE, { ...task, localId });
  return localId;
}

// ✅ get all queued
export async function getOfflineTasks() {
  const db = await getDb();
  return db.getAll(STORE);
}

// ✅ remove after successful sync
export async function removeOfflineTask(localId) {
  const db = await getDb();
  await db.delete(STORE, localId);
}