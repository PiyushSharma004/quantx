// ── Global State Store (Zustand) ─────────────────────────────────────────────
// One store, sliced into logical domains. No prop-drilling anywhere.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Instrument, Holding, Position, Order, PortfolioSummary, NewsItem, AIPrediction, OptionContract, ToastPayload, TabId, AsyncState, WatchlistItem, LiveQuote, LivePriceStatus } from '../types'
import { api } from '../services/api'
import { wsService } from '../services/wsService'

// ── helpers ──────────────────────────────────────────────────────────────────
function loading<T>(): AsyncState<T>  { return { data: null, loading: true,  error: null } }
function idle<T>():    AsyncState<T>  { return { data: null, loading: false, error: null } }
function failed<T>(e: string): AsyncState<T> { return { data: null, loading: false, error: e } }
function done<T>(d: T): AsyncState<T> { return { data: d,    loading: false, error: null } }

// ── Store shape ───────────────────────────────────────────────────────────────
interface QuantXStore {
  // UI
  activeTab:    TabId
  setActiveTab: (tab: TabId) => void

  // Toasts
  toasts:       ToastPayload[]
  showToast:    (message: string, color: string) => void
  dismissToast: (id: string) => void

  // Instruments (live ticks from WS)
  instruments:     Instrument[]
  setInstruments:  (list: Instrument[]) => void
  applyTicks:      (ticks: { symbol: string; ltp: number; changePct: number; volume: number }[]) => void

  // Portfolio
  summary:     AsyncState<PortfolioSummary>
  holdings:    AsyncState<Holding[]>
  positions:   AsyncState<Position[]>
  fetchPortfolio: () => Promise<void>

  // Orders
  orders:       AsyncState<Order[]>
  fetchOrders:  () => Promise<void>
  submitOrder:  (body: { symbol: string; side: 'BUY'|'SELL'; qty: number; price: number; orderType: string; exchange: string }) => Promise<void>

  // AI
  aiPrediction:     AsyncState<AIPrediction>
  optionChain:      AsyncState<OptionContract[]>
  fetchAI:          (sym: string) => Promise<void>

  // News
  news:        AsyncState<NewsItem[]>
  fetchNews:   () => Promise<void>

  // ── Watchlist ────────────────────────────────────────────────────────────
  watchlist:          AsyncState<WatchlistItem[]>
  watchlistQuotes:    Map<string, LiveQuote>      // keyed by symbol
  fetchWatchlist:     () => Promise<void>
  fetchWatchlistQuotes: () => Promise<void>
  addToWatchlist:     (symbol: string, exchange?: string) => Promise<{ alreadyExists: boolean }>
  removeFromWatchlist:(id: string) => Promise<void>
  removeFromWatchlistBySymbol: (symbol: string) => Promise<void>
  updateWatchlistItem:(id: string, patch: { notes?: string; alertPrice?: number | null }) => Promise<void>
  reorderWatchlist:   (ids: string[]) => Promise<void>
  isWatched:          (symbol: string) => boolean

  // ── Live Price ────────────────────────────────────────────────────────────
  livePriceStatus:    AsyncState<LivePriceStatus>
  fetchLivePriceStatus: () => Promise<void>
  fetchLivePrice:     (symbol: string) => Promise<LiveQuote | null>

  // WS bootstrap
  connectWS:   () => void
}

export const useStore = create<QuantXStore>((set, get) => ({
  // ── UI ──────────────────────────────────────────────────────────────────
  activeTab:    'portfolio',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── Toasts ──────────────────────────────────────────────────────────────
  toasts: [],
  showToast: (message, color) => {
    const id = `${Date.now()}-${Math.random()}`
    set(s => ({ toasts: [...s.toasts, { id, message, color }] }))
    setTimeout(() => get().dismissToast(id), 3500)
  },
  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Instruments ─────────────────────────────────────────────────────────
  instruments:    [],
  setInstruments: (list) => set({ instruments: list }),
  applyTicks: (ticks) => {
    const tickMap = new Map(ticks.map(t => [t.symbol, t]))
    set(s => ({
      instruments: s.instruments.map(inst => {
        const tick = tickMap.get(inst.symbol)
        return tick ? { ...inst, ltp: tick.ltp, changePct: tick.changePct, volume: tick.volume } : inst
      }),
      // Also update watchlistQuotes from WS ticks (real-time)
      watchlistQuotes: (() => {
        const next = new Map(s.watchlistQuotes)
        for (const tick of ticks) {
          const existing = next.get(tick.symbol)
          if (existing) {
            next.set(tick.symbol, { ...existing, price: tick.ltp, changePct: tick.changePct })
          }
        }
        return next
      })(),
    }))
  },

  // ── Portfolio ────────────────────────────────────────────────────────────
  summary:   idle(),
  holdings:  idle(),
  positions: idle(),
  fetchPortfolio: async () => {
    set({ summary: loading(), holdings: loading(), positions: loading() })
    try {
      const res = await api.portfolio()
      set({ summary: done(res.summary), holdings: done(res.holdings), positions: done(res.positions) })
    } catch (e) {
      const msg = (e as Error).message
      set({ summary: failed(msg), holdings: failed(msg), positions: failed(msg) })
    }
  },

  // ── Orders ───────────────────────────────────────────────────────────────
  orders: idle(),
  fetchOrders: async () => {
    set({ orders: loading() })
    try { set({ orders: done(await api.orders()) })
    } catch (e) { set({ orders: failed((e as Error).message) }) }
  },
  submitOrder: async (body) => {
    try {
      const order = await api.placeOrder(body)
      set(s => ({ orders: done([order, ...(s.orders.data ?? [])]) }))
      get().showToast(
        `${body.side} ${body.symbol} ×${body.qty} @ ₹${body.price.toLocaleString('en-IN')} — Executed`,
        body.side === 'BUY' ? '#00c853' : '#ff5252'
      )
      setTimeout(() => get().fetchPortfolio(), 800)
    } catch (e) {
      get().showToast(`Order failed: ${(e as Error).message}`, '#ff5252')
    }
  },

  // ── AI ────────────────────────────────────────────────────────────────────
  aiPrediction: idle(),
  optionChain:  idle(),
  fetchAI: async (sym) => {
    set({ aiPrediction: loading(), optionChain: loading() })
    try {
      const [pred, chain] = await Promise.all([api.aiPrediction(sym), api.optionChain(sym)])
      set({ aiPrediction: done(pred), optionChain: done(chain) })
    } catch (e) {
      const msg = (e as Error).message
      set({ aiPrediction: failed(msg), optionChain: failed(msg) })
    }
  },

  // ── News ──────────────────────────────────────────────────────────────────
  news: idle(),
  fetchNews: async () => {
    set({ news: loading() })
    try { set({ news: done(await api.news()) })
    } catch (e) { set({ news: failed((e as Error).message) }) }
  },

  // ── Watchlist ─────────────────────────────────────────────────────────────
  watchlist:       idle(),
  watchlistQuotes: new Map(),

  fetchWatchlist: async () => {
    set({ watchlist: loading() })
    try {
      const items = await api.watchlist()
      set({ watchlist: done(items) })
    } catch (e) { set({ watchlist: failed((e as Error).message) }) }
  },

  fetchWatchlistQuotes: async () => {
    try {
      const quotes = await api.watchlistQuotes()
      const qMap   = new Map(quotes.map(q => [q.symbol, q]))
      set({ watchlistQuotes: qMap })
    } catch { /* silently fail — prices will come from WS ticks */ }
  },

  addToWatchlist: async (symbol, exchange = 'NSE') => {
    try {
      const res = await api.addToWatchlist({ symbol, exchange })
      if (!res.alreadyExists) {
        set(s => ({
          watchlist: done([...(s.watchlist.data ?? []), res.item]),
        }))
        get().showToast(`${symbol} added to watchlist`, '#00c853')
      } else {
        get().showToast(`${symbol} is already in your watchlist`, '#ffd740')
      }
      return { alreadyExists: res.alreadyExists }
    } catch (e) {
      get().showToast(`Failed to add ${symbol}: ${(e as Error).message}`, '#ff5252')
      return { alreadyExists: false }
    }
  },

  removeFromWatchlist: async (id) => {
    const item = get().watchlist.data?.find(i => i.id === id)
    try {
      await api.removeFromWatchlist(id)
      set(s => ({
        watchlist: done((s.watchlist.data ?? []).filter(i => i.id !== id)),
      }))
      if (item) get().showToast(`${item.symbol} removed from watchlist`, '#ff5252')
    } catch (e) {
      get().showToast(`Remove failed: ${(e as Error).message}`, '#ff5252')
    }
  },

  removeFromWatchlistBySymbol: async (symbol) => {
    try {
      await api.removeFromWatchlistBySymbol(symbol)
      set(s => ({
        watchlist: done((s.watchlist.data ?? []).filter(i => i.symbol !== symbol.toUpperCase())),
      }))
      get().showToast(`${symbol} removed from watchlist`, '#ff5252')
    } catch (e) {
      get().showToast(`Remove failed: ${(e as Error).message}`, '#ff5252')
    }
  },

  updateWatchlistItem: async (id, patch) => {
    try {
      const updated = await api.updateWatchlistItem(id, patch)
      set(s => ({
        watchlist: done((s.watchlist.data ?? []).map(i => i.id === id ? updated : i)),
      }))
    } catch (e) {
      get().showToast(`Update failed: ${(e as Error).message}`, '#ff5252')
    }
  },

  reorderWatchlist: async (ids) => {
    try {
      const next = await api.reorderWatchlist(ids)
      set({ watchlist: done(next) })
    } catch (e) {
      get().showToast(`Reorder failed: ${(e as Error).message}`, '#ff5252')
    }
  },

  isWatched: (symbol) => {
    return !!(get().watchlist.data ?? []).find(i => i.symbol === symbol.toUpperCase())
  },

  // ── Live Price ────────────────────────────────────────────────────────────
  livePriceStatus: idle(),

  fetchLivePriceStatus: async () => {
    set({ livePriceStatus: loading() })
    try {
      const status = await api.livePriceStatus()
      set({ livePriceStatus: done(status) })
    } catch (e) { set({ livePriceStatus: failed((e as Error).message) }) }
  },

  fetchLivePrice: async (symbol) => {
    try {
      const quote = await api.livePrice(symbol)
      // Merge into watchlistQuotes cache
      set(s => {
        const next = new Map(s.watchlistQuotes)
        next.set(symbol.toUpperCase(), quote)
        return { watchlistQuotes: next }
      })
      return quote
    } catch { return null }
  },

  // ── WebSocket bootstrap ───────────────────────────────────────────────────
  connectWS: () => {
    wsService.connect()
    wsService.onTick(ticks => get().applyTicks(ticks))
    wsService.onOrder(() => {
      get().fetchOrders()
    })
  },
}))

