// ── Custom Hooks ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useStore } from '../context/store'

// Clock — IST time updated every second
export function useClock(): string {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(
      new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'Asia/Kolkata',
      })
    )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

// Chart data generators (pure, no side-effects)
export function useOHLCVSeries(n = 80, base = 2900, vol = 14, drift = 0.5) {
  const [series] = useState(() => {
    const arr = [base]
    for (let i = 1; i < n; i++)
      arr.push(Math.max(arr[i-1] + (Math.random() - 0.48) * vol + drift, 50))
    return arr
  })
  return series
}

export function useTimeLabels(n: number, fmt: 'time' | 'date' = 'time') {
  const [labels] = useState(() =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date()
      d.setMinutes(d.getMinutes() - n + i)
      return fmt === 'time'
        ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
        : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    })
  )
  return labels
}

// Convenience selectors — keep components lean
export const useActiveTab    = () => useStore(s => s.activeTab)
export const useSetActiveTab = () => useStore(s => s.setActiveTab)
export const useInstruments  = () => useStore(s => s.instruments)
export const useToasts       = () => useStore(s => s.toasts)
export const useShowToast    = () => useStore(s => s.showToast)
export const useSummary      = () => useStore(s => s.summary)
export const useHoldings     = () => useStore(s => s.holdings)
export const usePositions    = () => useStore(s => s.positions)
export const useOrders       = () => useStore(s => s.orders)
export const useSubmitOrder  = () => useStore(s => s.submitOrder)
export const useAIPrediction = () => useStore(s => s.aiPrediction)
export const useOptionChain  = () => useStore(s => s.optionChain)
export const useNews         = () => useStore(s => s.news)

// Watchlist selectors
export const useWatchlist              = () => useStore(s => s.watchlist)
export const useWatchlistQuotes        = () => useStore(s => s.watchlistQuotes)
export const useAddToWatchlist         = () => useStore(s => s.addToWatchlist)
export const useRemoveFromWatchlist    = () => useStore(s => s.removeFromWatchlist)
export const useRemoveWatchlistSymbol  = () => useStore(s => s.removeFromWatchlistBySymbol)
export const useUpdateWatchlistItem    = () => useStore(s => s.updateWatchlistItem)
export const useReorderWatchlist       = () => useStore(s => s.reorderWatchlist)
export const useIsWatched              = (symbol: string) => useStore(s => s.isWatched(symbol))
export const useFetchWatchlist         = () => useStore(s => s.fetchWatchlist)
export const useFetchWatchlistQuotes   = () => useStore(s => s.fetchWatchlistQuotes)

// Live price selectors
export const useLivePriceStatus        = () => useStore(s => s.livePriceStatus)
export const useFetchLivePriceStatus   = () => useStore(s => s.fetchLivePriceStatus)
export const useFetchLivePrice         = () => useStore(s => s.fetchLivePrice)
