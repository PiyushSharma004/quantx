// ── Client-side Types ─────────────────────────────────────────────────────────
export type {
  Instrument, Holding, Position, Order, OptionContract,
  PortfolioSummary, OHLCV, AIPrediction, NewsItem,
  ApiSuccess, ApiError, ApiResponse,
  WsMessage, WsMessageType, TickPayload,
  WatchlistItem, LiveQuote, LivePriceStatus,
} from './domain'

// All valid tab IDs — must match NAV array in Sidebar.tsx and TABS in TabNav.tsx
export type TabId =
  | 'portfolio'
  | 'paper'
  | 'charts'
  | 'news'
  | 'ai'
  | 'watchlist'
  | 'orderbook'

export interface ToastPayload {
  id:      string
  message: string
  color:   string
}

export interface AsyncState<T> {
  data:    T | null
  loading: boolean
  error:   string | null
}