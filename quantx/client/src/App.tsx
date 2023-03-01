// ── App Root ──────────────────────────────────────────────────────────────────
import { useEffect } from 'react'
import { useStore } from './context/store'
import { useActiveTab } from './hooks'
import AppShell       from './components/layout/AppShell'
import ToastStack     from './components/ui/ToastStack'
import PortfolioPage  from './pages/PortfolioPage'
import PaperTradePage from './pages/PaperTradePage'
import LiveChartsPage from './pages/LiveChartsPage'
import AIPage         from './pages/AIPage'
import WatchlistPage  from './pages/WatchlistPage'
import MarketNewsPage from './pages/MarketNewsPage'
import OrderBookPage  from './pages/OrderBookPage'

function ActivePage() {
  const tab = useActiveTab()
  switch (tab) {
    case 'portfolio':  return <PortfolioPage />
    case 'paper':      return <PaperTradePage />
    case 'charts':     return <LiveChartsPage />
    case 'news':       return <MarketNewsPage />
    case 'orderbook':  return <OrderBookPage />
    case 'ai':         return <AIPage />
    case 'watchlist':  return <WatchlistPage />
    default:           return <PortfolioPage />
  }
}

export default function App() {
  const connectWS            = useStore(s => s.connectWS)
  const setInstruments       = useStore(s => s.setInstruments)
  const fetchPortfolio       = useStore(s => s.fetchPortfolio)
  const fetchWatchlist       = useStore(s => s.fetchWatchlist)
  const fetchWatchlistQuotes = useStore(s => s.fetchWatchlistQuotes)
  const fetchLivePriceStatus = useStore(s => s.fetchLivePriceStatus)
  const fetchNews            = useStore(s => s.fetchNews)

  useEffect(() => {
    fetch('/api/instruments')
      .then(r => r.json())
      .then(json => { if (json.ok) setInstruments(json.data) })
      .catch(() => { /* server may not be running in static preview */ })

    fetchPortfolio()
    fetchWatchlist()
    fetchWatchlistQuotes()
    fetchLivePriceStatus()
    fetchNews()
    connectWS()
  }, [connectWS, setInstruments, fetchPortfolio, fetchWatchlist, fetchWatchlistQuotes, fetchLivePriceStatus, fetchNews])

  return (
    <>
      <AppShell>
        <ActivePage />
      </AppShell>
      <ToastStack />
    </>
  )
}
