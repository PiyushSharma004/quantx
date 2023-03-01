// ── API Service — wraps all server calls ─────────────────────────────────────
// Change BASE_URL via VITE_API_BASE_URL env var for staging/production.

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  const json = await res.json()

  if (!json.ok) {
    throw new Error(json.error ?? `API error ${res.status}`)
  }

  return json.data as T
}

// ── Typed API methods ─────────────────────────────────────────────────────────
import type {
  Instrument, Holding, Position, Order, PortfolioSummary,
  OHLCV, AIPrediction, OptionContract, NewsItem,
  WatchlistItem, LiveQuote, LivePriceStatus,
} from '../types'

export interface PortfolioResponse {
  summary:   PortfolioSummary
  holdings:  Holding[]
  positions: Position[]
}

export interface AddWatchlistPayload {
  symbol:     string
  exchange?:  string
  notes?:     string
  alertPrice?: number
}

export interface UpdateWatchlistPayload {
  notes?:      string
  alertPrice?: number | null
}

export const api = {
  // Instruments
  instruments:    ()                        => request<Instrument[]>('/instruments'),
  instrument:     (sym: string)             => request<Instrument>(`/instruments/${sym}`),

  // Portfolio
  portfolio:      ()                        => request<PortfolioResponse>('/portfolio'),

  // Charts
  chart: (sym: string, interval = '1m', bars = 80) =>
    request<OHLCV[]>(`/charts/${sym}?interval=${interval}&bars=${bars}`),

  // Orders
  orders:         ()                        => request<Order[]>('/orders'),
  placeOrder: (body: {
    symbol:    string
    side:      'BUY' | 'SELL'
    qty:       number
    price:     number
    orderType: string
    exchange:  string
  }) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),

  // AI
  aiPrediction:   (sym: string)             => request<AIPrediction>(`/ai/${sym}`),

  // Options
  optionChain:    (sym: string)             => request<OptionContract[]>(`/options/${sym}`),

  // News
  news:           ()                        => request<NewsItem[]>('/news'),

  // Health
  health:         ()                        => request<{ status: string; uptime: number }>('/health'),

  // ── Watchlist ───────────────────────────────────────────────────────────────
  watchlist:      ()                        => request<WatchlistItem[]>('/watchlist'),
  watchlistQuotes:()                        => request<LiveQuote[]>('/watchlist/quotes'),

  addToWatchlist: (payload: AddWatchlistPayload) =>
    request<{ item: WatchlistItem; alreadyExists: boolean }>('/watchlist', {
      method: 'POST',
      body:   JSON.stringify(payload),
    }),

  updateWatchlistItem: (id: string, payload: UpdateWatchlistPayload) =>
    request<WatchlistItem>(`/watchlist/${id}`, {
      method: 'PATCH',
      body:   JSON.stringify(payload),
    }),

  removeFromWatchlist: (id: string) =>
    request<{ removed: boolean }>(`/watchlist/${id}`, { method: 'DELETE' }),

  removeFromWatchlistBySymbol: (symbol: string) =>
    request<{ removed: boolean }>(`/watchlist/symbol/${symbol}`, { method: 'DELETE' }),

  reorderWatchlist: (ids: string[]) =>
    request<WatchlistItem[]>('/watchlist/reorder', {
      method: 'POST',
      body:   JSON.stringify({ ids }),
    }),

  // ── Live Prices ─────────────────────────────────────────────────────────────
  livePrice:      (sym: string)             => request<LiveQuote>(`/live-price/${sym}`),
  livePriceStatus:()                        => request<LivePriceStatus>('/live-price/status'),
}
