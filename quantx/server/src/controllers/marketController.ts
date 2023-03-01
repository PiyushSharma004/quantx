// ── Route Controllers ────────────────────────────────────────────────────────
import type { Request, Response } from 'express'
import { z } from 'zod'
import * as mds from '../services/marketDataService.js'
import { broadcastOrderUpdate } from '../services/wsService.js'
import type { ApiSuccess, ApiError } from '../types/index.js'

function ok<T>(res: Response, data: T, status = 200) {
  const body: ApiSuccess<T> = { ok: true, data }
  return res.status(status).json(body)
}

function fail(res: Response, error: string, code: string, status = 400) {
  const body: ApiError = { ok: false, error, code }
  return res.status(status).json(body)
}

// GET /api/instruments
export function listInstruments(req: Request, res: Response) {
  return ok(res, mds.getInstruments())
}

// GET /api/instruments/:symbol
export function getInstrument(req: Request, res: Response) {
  const inst = mds.getInstrument(req.params.symbol)
  if (!inst) return fail(res, 'Instrument not found', 'NOT_FOUND', 404)
  return ok(res, inst)
}

// GET /api/portfolio
export function getPortfolio(req: Request, res: Response) {
  return ok(res, {
    summary:   mds.getPortfolioSummary(),
    holdings:  mds.getHoldings(),
    positions: mds.getPositions(),
  })
}

// GET /api/charts/:symbol
export function getChart(req: Request, res: Response) {
  const { symbol } = req.params
  const interval   = (req.query.interval as string) || '1m'
  const bars       = parseInt((req.query.bars as string) || '80', 10)
  return ok(res, mds.getOHLCV(symbol, interval, bars))
}

// GET /api/orders
export function listOrders(_req: Request, res: Response) {
  return ok(res, mds.getOrders())
}

// POST /api/orders
const PlaceOrderSchema = z.object({
  symbol:    z.string().min(1).max(30).transform(s => s.toUpperCase()),
  side:      z.enum(['BUY', 'SELL']),
  qty:       z.number().int().positive().max(100000),
  price:     z.number().positive(),
  orderType: z.enum(['MARKET', 'LIMIT', 'SL', 'SL-M']).default('MARKET'),
  exchange:  z.enum(['NSE', 'BSE', 'NFO', 'MCX']).default('NSE'),
})

export function placeOrder(req: Request, res: Response) {
  const parsed = PlaceOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    return fail(res, 'Invalid order payload', 'VALIDATION_ERROR', 422)
  }
  const { symbol, side, qty, price, orderType, exchange } = parsed.data
  const order = mds.placeOrder(symbol, side, qty, price, orderType, exchange)
  broadcastOrderUpdate(order)        // push to all WS clients
  return ok(res, order, 201)
}

// GET /api/ai/:symbol
export function getAIPrediction(req: Request, res: Response) {
  return ok(res, mds.getAIPrediction(req.params.symbol))
}

// GET /api/options/:symbol
export function getOptionChain(req: Request, res: Response) {
  return ok(res, mds.getOptionChain(req.params.symbol))
}

// GET /api/news
export function getNews(_req: Request, res: Response) {
  return ok(res, mds.getNews())
}

// GET /api/health
export function healthCheck(_req: Request, res: Response) {
  return ok(res, {
    status:    'ok',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version ?? '1.0.0',
  })
}
