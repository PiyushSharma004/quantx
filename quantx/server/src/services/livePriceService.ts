// ── Live Price Service ────────────────────────────────────────────────────────
// Uses Twelve Data free tier (800 req/day) when TWELVE_DATA_API_KEY is set.
// Falls back to the existing mock tick simulator when key is absent or quota
// is exceeded — so the app always works in dev without any keys.
//
// Twelve Data docs: https://twelvedata.com/docs
// Endpoint: GET https://api.twelvedata.com/price?symbol=RELIANCE:NSE&apikey=...
//
// NSE symbol format for Twelve Data: "RELIANCE:NSE"
// Index format: "NIFTY:NSE" (not the space-delimited "NIFTY 50")

import type { LiveQuote } from '../types/index.js'

const TD_BASE = 'https://api.twelvedata.com'
const API_KEY = process.env.TWELVE_DATA_API_KEY ?? ''

// Map internal symbols → Twelve Data format
const SYMBOL_MAP: Record<string, string> = {
  'NIFTY 50':   'NIFTY:NSE',
  'BANKNIFTY':  'BANKNIFTY:NSE',
  'RELIANCE':   'RELIANCE:NSE',
  'TCS':        'TCS:NSE',
  'INFY':       'INFY:NSE',
  'HDFCBANK':   'HDFCBANK:NSE',
  'ICICIBANK':  'ICICIBANK:NSE',
  'WIPRO':      'WIPRO:NSE',
  'BAJFINANCE': 'BAJFINANCE:NSE',
  'TATAMOTORS': 'TATAMOTORS:NSE',
}

// Simple in-memory rate-limit guard: max 55 req/min (TD free = 8/min per key)
// We batch all symbols in one call using the comma-separated batch endpoint.
let lastBatchTime  = 0
let cachedQuotes: Map<string, LiveQuote> = new Map()

// ── Twelve Data batch fetch ──────────────────────────────────────────────────
async function fetchFromTwelveData(symbols: string[]): Promise<Map<string, LiveQuote>> {
  if (!API_KEY) throw new Error('TWELVE_DATA_API_KEY not set')

  const tdSymbols = symbols
    .map(s => SYMBOL_MAP[s])
    .filter(Boolean)
    .join(',')

  if (!tdSymbols) throw new Error('No mappable symbols')

  // Batch quote endpoint — one HTTP call for all symbols
  const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(tdSymbols)}&apikey=${API_KEY}&dp=2`
  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })

  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`)

  const json = await res.json() as Record<string, TwelveQuote> | TwelveQuote

  const result = new Map<string, LiveQuote>()

  // Single symbol response is a flat object; multi-symbol is keyed by TD symbol
  if (symbols.length === 1 && !isBatch(json)) {
    const td  = json as TwelveQuote
    const sym = symbols[0]
    result.set(sym, toQuote(sym, td))
  } else {
    const batch = json as Record<string, TwelveQuote>
    for (const [tdSym, td] of Object.entries(batch)) {
      const internalSym = Object.keys(SYMBOL_MAP).find(k => SYMBOL_MAP[k] === tdSym)
      if (internalSym && td.price) result.set(internalSym, toQuote(internalSym, td))
    }
  }

  return result
}

interface TwelveQuote {
  symbol:      string
  name:        string
  price:       string
  change:      string
  percent_change: string
  high:        string
  low:         string
  volume:      string
  datetime:    string
  status?:     string
}

function isBatch(obj: unknown): obj is Record<string, TwelveQuote> {
  return typeof obj === 'object' && obj !== null && !('price' in obj)
}

function toQuote(symbol: string, td: TwelveQuote): LiveQuote {
  return {
    symbol,
    price:     parseFloat(td.price)        || 0,
    change:    parseFloat(td.change)       || 0,
    changePct: parseFloat(td.percent_change) || 0,
    high:      parseFloat(td.high)         || 0,
    low:       parseFloat(td.low)          || 0,
    volume:    parseInt(td.volume)         || 0,
    timestamp: td.datetime || new Date().toISOString(),
    source:    'twelve_data',
  }
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
// Reads from the tick simulator's current prices via import
import { getInstrument } from './marketDataService.js'

function mockQuote(symbol: string): LiveQuote {
  const inst = getInstrument(symbol)
  return {
    symbol,
    price:     inst?.ltp       ?? 0,
    change:    inst?.change    ?? 0,
    changePct: inst?.changePct ?? 0,
    high:      inst?.high      ?? 0,
    low:       inst?.low       ?? 0,
    volume:    inst?.volume    ?? 0,
    timestamp: new Date().toISOString(),
    source:    'mock',
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get live quotes for a list of symbols.
 * Tries Twelve Data first; falls back to mock simulator on any error.
 * Caches results for 15 seconds to avoid hammering the free tier.
 */
export async function getLiveQuotes(symbols: string[]): Promise<LiveQuote[]> {
  const now = Date.now()

  // Use cache if fresh (< 15s)
  if (now - lastBatchTime < 15_000 && cachedQuotes.size > 0) {
    return symbols.map(s => cachedQuotes.get(s) ?? mockQuote(s))
  }

  try {
    const quotes = await fetchFromTwelveData(symbols)
    cachedQuotes  = quotes
    lastBatchTime = now
    return symbols.map(s => quotes.get(s) ?? mockQuote(s))
  } catch (err) {
    // Graceful degradation — always return something
    const msg = (err as Error).message
    if (API_KEY) {
      console.warn(`[LivePrice] Twelve Data error (${msg}), using mock fallback`)
    }
    return symbols.map(s => mockQuote(s))
  }
}

/**
 * Get live quote for a single symbol.
 */
export async function getLiveQuote(symbol: string): Promise<LiveQuote> {
  const results = await getLiveQuotes([symbol])
  return results[0]
}

/**
 * Check if Twelve Data API is configured and reachable.
 */
export async function checkLivePriceStatus(): Promise<{
  configured: boolean
  reachable:  boolean
  source:     string
  keyPresent: boolean
}> {
  if (!API_KEY) {
    return { configured: false, reachable: false, source: 'mock', keyPresent: false }
  }
  try {
    const url = `${TD_BASE}/api_usage?apikey=${API_KEY}`
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const ok   = res.ok
    return { configured: true, reachable: ok, source: ok ? 'twelve_data' : 'mock', keyPresent: true }
  } catch {
    return { configured: true, reachable: false, source: 'mock', keyPresent: true }
  }
}
