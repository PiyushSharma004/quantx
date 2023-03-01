// ── API Router ───────────────────────────────────────────────────────────────
import { Router } from 'express'
import * as ctrl from '../controllers/marketController.js'
import * as wlCtrl from '../controllers/watchlistController.js'

const router = Router()

// Health
router.get('/health', ctrl.healthCheck)

// Market data
router.get('/instruments',         ctrl.listInstruments)
router.get('/instruments/:symbol', ctrl.getInstrument)

// Portfolio
router.get('/portfolio', ctrl.getPortfolio)

// Charts (OHLCV candles)
router.get('/charts/:symbol', ctrl.getChart)

// Orders (paper trading)
router.get('/orders',  ctrl.listOrders)
router.post('/orders', ctrl.placeOrder)

// AI predictions
router.get('/ai/:symbol', ctrl.getAIPrediction)

// Options
router.get('/options/:symbol', ctrl.getOptionChain)

// News
router.get('/news', ctrl.getNews)

// ── Watchlist ─────────────────────────────────────────────────────────────────
router.get('/watchlist',                       wlCtrl.getWatchlist)
router.post('/watchlist',                      wlCtrl.addToWatchlist)
router.post('/watchlist/reorder',              wlCtrl.reorderWatchlist)
router.get('/watchlist/quotes',                wlCtrl.getWatchlistQuotes)
router.patch('/watchlist/:id',                 wlCtrl.updateWatchlistItem)
router.delete('/watchlist/:id',                wlCtrl.removeFromWatchlist)
router.delete('/watchlist/symbol/:symbol',     wlCtrl.removeBySymbol)

// ── Live Prices (Twelve Data with mock fallback) ──────────────────────────────
router.get('/live-price/status',   wlCtrl.getLivePriceStatus)
router.get('/live-price/:symbol',  wlCtrl.getLivePrice)

export default router
