/**
 * Offline Score Queue (IndexedDB)
 *
 * When a network error is detected while submitting match scores the entry is
 * enqueued here. On reconnect, `use-offline-sync.ts` drains the queue in the
 * order entries were added.
 *
 * Schema of each entry:
 *   id           – client-generated UUID
 *   matchId      – matches.id
 *   scores       – MatchScoresInput (round1/2/3)
 *   winMethod    – WinMethod (default 'SCORE')
 *   winningRound – number | undefined
 *   winnerId     – string | undefined (explicit winner for KO/TKO/etc.)
 *   queuedAt     – ISO timestamp
 *   attempts     – number of failed send attempts since queuing
 *   lastError    – last error message (or null)
 */

import type { WinMethod } from '@/types/models'
import type { MatchScoresInput } from '@/lib/validations/match-scores'

export interface QueuedScore {
  id: string
  matchId: string
  scores: MatchScoresInput
  winMethod: WinMethod
  winningRound?: number
  winnerId?: string
  queuedAt: string
  attempts: number
  lastError: string | null
}

const DB_NAME = 'tourneydo-offline'
const STORE   = 'score-queue'
const VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

/** Add a new entry to the offline queue. */
export async function enqueue(
  matchId: string,
  scores: MatchScoresInput,
  winMethod: WinMethod = 'SCORE',
  winningRound?: number,
  winnerId?: string
): Promise<void> {
  const db = await openDB()

  const entry: QueuedScore = {
    id:           crypto.randomUUID(),
    matchId,
    scores,
    winMethod,
    winningRound,
    winnerId,
    queuedAt:     new Date().toISOString(),
    attempts:     0,
    lastError:    null,
  }

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req   = store.add(entry)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

/** Return all entries, oldest first (by queuedAt). */
export async function getAll(): Promise<QueuedScore[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req   = store.getAll()
    req.onsuccess = () => {
      const rows = (req.result as QueuedScore[])
      rows.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))
      resolve(rows)
    }
    req.onerror = () => reject(req.error)
  })
}

/** Remove an entry by id (call after successful send). */
export async function dequeue(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req   = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

/** Remove all entries for a specific match (e.g. after manual refresh). */
export async function clearMatch(matchId: string): Promise<void> {
  const db  = await openDB()
  const all = await getAll()
  const ids = all.filter(e => e.matchId === matchId).map(e => e.id)

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    let done = 0
    if (ids.length === 0) { resolve(); return }
    for (const id of ids) {
      const req = store.delete(id)
      req.onsuccess = () => { if (++done === ids.length) resolve() }
      req.onerror   = () => reject(req.error)
    }
  })
}

/** Update the attempts count and lastError for a queue entry after a failed send. */
export async function recordFailure(id: string, errorMessage: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const entry = getReq.result as QueuedScore | undefined
      if (!entry) { resolve(); return }
      entry.attempts++
      entry.lastError = errorMessage
      const putReq = store.put(entry)
      putReq.onsuccess = () => resolve()
      putReq.onerror   = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

/** Return the total number of pending entries. */
export async function count(): Promise<number> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req   = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}
