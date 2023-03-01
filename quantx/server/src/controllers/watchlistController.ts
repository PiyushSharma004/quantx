// ── Watchlist Controller ──────────────────────────────────────────────────────
import type { Request, Response } from 'express'
import { z } from 'zod'
import * as wl from '../services/watchlistService.js'
import { getLiveQuotes, checkLivePriceStatus } from '../services/livePriceService.js'
import type { ApiSuccess, ApiError } from '../types/index.js'

function ok<T>(res: Response, data: T, status = 200) {
  const body: ApiSuccess<T> = { ok: true, data }
  return res.status(status).json(body)
}
function fail(res: Response, error: string, code: string, status = 400) {
  const body: ApiError = { ok: false, error, code }
  return res.status(status).json(body)
}

// For now we treat every request as the "default" user.
// When you add JWT auth, replace this with req.user.id from your auth middleware.
const userId = (_req: Request) => 'default'

// ── GET /api/watchlist ────────────────────────────────────────────────────────
export async function getWatchlist(req: Request, res: Response) {
  const items = wl.getWatchlist(userId(req))
  return ok(res, items)
}

// ── POST /api/watchlist ───────────────────────────────────────────────────────
const AddSchema = z.object({
  symbol:     z.string().min(1).max(30).transform(s => s.toUpperCase()),
  exchange:   z.enum(['NSE', 'BSE', 'NFO', 'MCX']).default('NSE'),
  notes:      z.string().max(200).optional(),
  alertPrice: z.number().positive().optional(),
})

export function addToWatchlist(req: Request, res: Response) {
  const parsed = AddSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 'Invalid payload', 'VALIDATION_ERROR', 422)

  const { item, alreadyExists } = wl.addToWatchlist(parsed.data, userId(req))
  return ok(res, { item, alreadyExists }, alreadyExists ? 200 : 201)
}

// ── DELETE /api/watchlist/:id ─────────────────────────────────────────────────
export function removeFromWatchlist(req: Request, res: Response) {
  const removed = wl.removeFromWatchlist(req.params.id, userId(req))
  if (!removed) return fail(res, 'Item not found', 'NOT_FOUND', 404)
  return ok(res, { removed: true })
}

// ── PATCH /api/watchlist/:id ──────────────────────────────────────────────────
const UpdateSchema = z.object({
  notes:      z.string().max(200).optional(),
  alertPrice: z.number().positive().nullable().optional(),
})

export function updateWatchlistItem(req: Request, res: Response) {
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 'Invalid payload', 'VALIDATION_ERROR', 422)

  const updated = wl.updateWatchlistItem(req.params.id, parsed.data, userId(req))
  if (!updated) return fail(res, 'Item not found', 'NOT_FOUND', 404)
  return ok(res, updated)
}

// ── POST /api/watchlist/reorder ───────────────────────────────────────────────
const ReorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export function reorderWatchlist(req: Request, res: Response) {
  const parsed = ReorderSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 'Invalid payload', 'VALIDATION_ERROR', 422)

  const next = wl.reorderWatchlist(parsed.data.ids, userId(req))
  return ok(res, next)
}

// ── GET /api/watchlist/quotes ─────────────────────────────────────────────────
// Returns live prices for all watchlist symbols in one shot.
export async function getWatchlistQuotes(req: Request, res: Response) {
  const items   = wl.getWatchlist(userId(req))
  if (items.length === 0) return ok(res, [])

  const symbols = items.map(i => i.symbol)
  const quotes  = await getLiveQuotes(symbols)
  return ok(res, quotes)
}

// ── GET /api/live-price/:symbol ───────────────────────────────────────────────
// Single symbol live quote (useful for paper trade price pre-fill)
export async function getLivePrice(req: Request, res: Response) {
  const sym    = req.params.symbol.toUpperCase()
  const quotes = await getLiveQuotes([sym])
  return ok(res, quotes[0])
}

// ── GET /api/live-price/status ────────────────────────────────────────────────
export async function getLivePriceStatus(_req: Request, res: Response) {
  const status = await checkLivePriceStatus()
  return ok(res, status)
}

// ── DELETE /api/watchlist/symbol/:symbol ──────────────────────────────────────
export function removeBySymbol(req: Request, res: Response) {
  const removed = wl.removeBySymbol(req.params.symbol, userId(req))
  if (!removed) return fail(res, 'Symbol not in watchlist', 'NOT_FOUND', 404)
  return ok(res, { removed: true })
}
