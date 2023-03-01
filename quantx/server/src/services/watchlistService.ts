// ── Watchlist Service ─────────────────────────────────────────────────────────
// In-memory store (swap for SQLite/Postgres in production by implementing the
// same interface in a persistent adapter and replacing the import).
// Per-user watchlists are identified by a userId string; for single-user
// desktop use the default userId is "default".

import { randomUUID } from 'crypto'
import type { WatchlistItem } from '../types/index.js'
import { getInstrument } from './marketDataService.js'

// ── Storage ───────────────────────────────────────────────────────────────────
// Map<userId, WatchlistItem[]>
const store = new Map<string, WatchlistItem[]>([
  ['default', [
    // Pre-seed a few items so the UI isn't empty on first run
    { id: randomUUID(), symbol: 'RELIANCE',   name: 'Reliance Industries Ltd',   exchange: 'NSE', addedAt: new Date().toISOString() },
    { id: randomUUID(), symbol: 'TCS',        name: 'Tata Consultancy Services', exchange: 'NSE', addedAt: new Date().toISOString() },
    { id: randomUUID(), symbol: 'TATAMOTORS', name: 'Tata Motors Ltd',           exchange: 'NSE', addedAt: new Date().toISOString() },
    { id: randomUUID(), symbol: 'INFY',       name: 'Infosys Ltd',               exchange: 'NSE', addedAt: new Date().toISOString() },
  ]],
])

function list(userId = 'default'): WatchlistItem[] {
  return store.get(userId) ?? []
}

function find(userId = 'default', id: string): WatchlistItem | undefined {
  return list(userId).find(i => i.id === id)
}

function findBySymbol(userId = 'default', symbol: string): WatchlistItem | undefined {
  return list(userId).find(i => i.symbol === symbol.toUpperCase())
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getWatchlist(userId = 'default'): WatchlistItem[] {
  return list(userId)
}

export interface AddToWatchlistInput {
  symbol:      string
  exchange?:   string
  notes?:      string
  alertPrice?: number
}

export function addToWatchlist(
  input: AddToWatchlistInput,
  userId = 'default'
): { item: WatchlistItem; alreadyExists: boolean } {
  const sym = input.symbol.toUpperCase()

  // Idempotent — don't add duplicates
  const existing = findBySymbol(userId, sym)
  if (existing) return { item: existing, alreadyExists: true }

  // Enrich with name from instrument data if available
  const inst = getInstrument(sym)
  const item: WatchlistItem = {
    id:          randomUUID(),
    symbol:      sym,
    name:        inst?.name ?? sym,
    exchange:    input.exchange ?? inst?.exchange ?? 'NSE',
    addedAt:     new Date().toISOString(),
    notes:       input.notes,
    alertPrice:  input.alertPrice,
  }

  const current = list(userId)
  store.set(userId, [...current, item])
  return { item, alreadyExists: false }
}

export interface UpdateWatchlistItemInput {
  notes?:       string
  alertPrice?:  number | null
}

export function updateWatchlistItem(
  id: string,
  input: UpdateWatchlistItemInput,
  userId = 'default'
): WatchlistItem | null {
  const current = list(userId)
  const idx     = current.findIndex(i => i.id === id)
  if (idx === -1) return null

  const updated: WatchlistItem = {
    ...current[idx],
    ...(input.notes       !== undefined && { notes:      input.notes }),
    ...(input.alertPrice  !== undefined && { alertPrice: input.alertPrice ?? undefined }),
  }
  const next = [...current]
  next[idx]  = updated
  store.set(userId, next)
  return updated
}

export function removeFromWatchlist(id: string, userId = 'default'): boolean {
  const current = list(userId)
  const next    = current.filter(i => i.id !== id)
  if (next.length === current.length) return false   // not found
  store.set(userId, next)
  return true
}

export function removeBySymbol(symbol: string, userId = 'default'): boolean {
  const item = findBySymbol(userId, symbol)
  if (!item) return false
  return removeFromWatchlist(item.id, userId)
}

export function reorderWatchlist(orderedIds: string[], userId = 'default'): WatchlistItem[] {
  const current = list(userId)
  const idMap   = new Map(current.map(i => [i.id, i]))
  const reordered = orderedIds.map(id => idMap.get(id)).filter(Boolean) as WatchlistItem[]
  // Append any items not mentioned in orderedIds at the end
  const mentioned = new Set(orderedIds)
  const rest      = current.filter(i => !mentioned.has(i.id))
  const next      = [...reordered, ...rest]
  store.set(userId, next)
  return next
}

export function isInWatchlist(symbol: string, userId = 'default'): boolean {
  return !!findBySymbol(userId, symbol)
}
