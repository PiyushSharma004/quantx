// ── Shared Domain Types ──────────────────────────────────────────────────────
// These mirror what the REST API returns and what the client consumes.

export interface Instrument {
  symbol:    string
  name:      string
  exchange:  'NSE' | 'BSE' | 'NFO' | 'MCX'
  ltp:       number
  open:      number
  high:      number
  low:       number
  close:     number
  change:    number      // absolute
  changePct: number      // percentage
  volume:    number
  oi?:       number      // open interest (F&O only)
}

export interface Holding {
  symbol:       string
  name:         string
  qty:          number
  avgPrice:     number
  ltp:          number
  currentValue: number
  todayPnl:     number
  todayPnlPct:  number
  totalPnl:     number
  totalPnlPct:  number
}

export interface Position {
  symbol:    string
  qty:       number       // negative = short
  avgPrice:  number
  ltp:       number
  pnl:       number
  pnlPct:    number
  product:   'MIS' | 'CNC' | 'NRML'
}

export interface Order {
  orderId:    string
  symbol:     string
  side:       'BUY' | 'SELL'
  qty:        number
  price:      number
  orderType:  'MARKET' | 'LIMIT' | 'SL' | 'SL-M'
  status:     'OPEN' | 'EXECUTED' | 'CANCELLED' | 'REJECTED'
  exchange:   string
  timestamp:  string      // ISO 8601
}

export interface OptionContract {
  strike:    number
  expiry:    string
  ceLtp:     number
  peLtp:     number
  ceOi:      number
  peOi:      number
  ceIv:      number
  peIv:      number
  pcr:       number
  atm:       boolean
}

export interface PortfolioSummary {
  totalValue:    number
  invested:      number
  totalPnl:      number
  totalPnlPct:   number
  todayPnl:      number
  todayPnlPct:   number
  buyingPower:   number
  dayHigh:       number
  dayLow:        number
}

export interface OHLCV {
  timestamp: string
  open:      number
  high:      number
  low:       number
  close:     number
  volume:    number
}

export interface AIPrediction {
  symbol:     string
  confidence: number      // 0–100
  next1d:     number
  next5d:     number
  signal:     'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  mse:        number
  accuracy:   number
  updatedAt:  string
}

export interface NewsItem {
  id:        string
  source:    string
  title:     string
  url:       string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  symbols:   string[]
  publishedAt: string
}

// ── Watchlist ────────────────────────────────────────────────────────────────
export interface WatchlistItem {
  id:        string   // uuid
  symbol:    string
  name:      string
  exchange:  string
  addedAt:   string   // ISO 8601
  notes?:    string
  alertPrice?: number // optional price alert
}

// ── Live Price (from external API) ───────────────────────────────────────────
export interface LiveQuote {
  symbol:    string
  price:     number
  change:    number
  changePct: number
  high:      number
  low:       number
  volume:    number
  timestamp: string
  source:    'twelve_data' | 'mock'
}

// ── API Response Envelope ────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  ok:   true
  data: T
}

export interface ApiError {
  ok:      false
  error:   string
  code:    string
  details?: unknown
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ── WebSocket message types ──────────────────────────────────────────────────
export type WsMessageType =
  | 'TICK'
  | 'ORDER_UPDATE'
  | 'PORTFOLIO_UPDATE'
  | 'PING'
  | 'PONG'

export interface WsMessage<T = unknown> {
  type:      WsMessageType
  payload:   T
  timestamp: string
}

export interface TickPayload {
  symbol:    string
  ltp:       number
  changePct: number
  volume:    number
}
