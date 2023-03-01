// ── OrderBookPage.tsx ─────────────────────────────────────────────────────────
//
// Market Depth / Order Book feature for QuantX.
//
// What it shows (exactly like Zerodha's Market Depth panel):
//   • Best 5 bid (buy) levels  — price + qty + orders
//   • Best 5 ask (sell) levels — price + qty + orders
//   • Depth bar behind each row showing qty share relative to total
//   • Live total bid qty vs ask qty with a cumulative imbalance bar
//   • OHLC, 52-week H/L, circuit limits, ATP (avg trade price)
//   • A mini "Quick Order" form — pre-filled from clicking any row
//   • Simulated live ticks every ~1.5s so the book visually updates
//
// Integration into your app:
//   1. Drop this file into  client/src/pages/OrderBookPage.tsx
//   2. Add  'orderbook'  to the TabId union in  client/src/types/index.ts
//   3. Add a nav item in  client/src/components/layout/Sidebar.tsx
//   4. Add a tab in       client/src/components/layout/TabNav.tsx
//   5. Add the case in    client/src/App.tsx  (ActivePage switch)
//
// No new dependencies required — uses only React + existing CSS variables.

import { useState, useEffect, useRef, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DepthLevel {
  price:  number   // bid or ask price
  qty:    number   // total quantity at this level
  orders: number   // number of orders stacked here
}

interface OrderBook {
  bids: DepthLevel[]   // best 5 buys  (descending price)
  asks: DepthLevel[]   // best 5 sells (ascending price)
}

interface Quote {
  ltp:       number   // last traded price
  open:      number
  high:      number
  low:       number
  close:     number   // prev close
  atp:       number   // average trade price
  volume:    number
  oi:        number   // open interest (for F&O)
  circuitUp: number   // upper circuit limit
  circuitDn: number   // lower circuit limit
  weekHigh:  number   // 52-week high
  weekLow:   number   // 52-week low
  change:    number   // abs change from prev close
  changePct: number
}

// Symbols the user can switch between
const SYMBOLS = [
  { sym: 'RELIANCE',   name: 'Reliance Industries',  exch: 'NSE', base: 2943.60, vol: 14 },
  { sym: 'TCS',        name: 'Tata Consultancy Svc', exch: 'NSE', base: 3812.45, vol: 18 },
  { sym: 'HDFCBANK',   name: 'HDFC Bank Ltd',         exch: 'NSE', base: 1642.10, vol: 8  },
  { sym: 'INFY',       name: 'Infosys Ltd',            exch: 'NSE', base: 1487.80, vol: 10 },
  { sym: 'NIFTY 50',   name: 'Nifty 50 Index',        exch: 'NSE', base: 22410.3, vol: 80 },
  { sym: 'BANKNIFTY',  name: 'Bank Nifty Index',      exch: 'NFO', base: 48210.5, vol: 180 },
  { sym: 'BAJFINANCE', name: 'Bajaj Finance Ltd',     exch: 'NSE', base: 6724.90, vol: 28 },
  { sym: 'TATAMOTORS', name: 'Tata Motors Ltd',       exch: 'NSE', base: 812.60,  vol: 5  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Data generators  (simulate real market depth)
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a realistic order book around `mid` price */
function generateBook(mid: number, tickSize = 0.05): OrderBook {
  const t = tickSize

  // Bids: prices below mid, descending
  const bids: DepthLevel[] = Array.from({ length: 5 }, (_, i) => ({
    price:  +(mid - (i + 1) * t - Math.random() * t * 0.3).toFixed(2),
    qty:    Math.floor(Math.random() * 3000 + 200),
    orders: Math.floor(Math.random() * 40 + 1),
  }))

  // Asks: prices above mid, ascending
  const asks: DepthLevel[] = Array.from({ length: 5 }, (_, i) => ({
    price:  +(mid + (i + 1) * t + Math.random() * t * 0.3).toFixed(2),
    qty:    Math.floor(Math.random() * 3000 + 200),
    orders: Math.floor(Math.random() * 40 + 1),
  }))

  return { bids, asks }
}

/** Generate a full quote object for a symbol */
function generateQuote(base: number, prevClose: number): Quote {
  const ltp       = +(base + (Math.random() - 0.49) * 2).toFixed(2)
  const change    = +(ltp - prevClose).toFixed(2)
  const changePct = +((change / prevClose) * 100).toFixed(2)
  return {
    ltp,
    open:      +(prevClose + (Math.random() - 0.45) * 8).toFixed(2),
    high:      +(ltp + Math.random() * 15).toFixed(2),
    low:       +(ltp - Math.random() * 15).toFixed(2),
    close:     prevClose,
    atp:       +(ltp + (Math.random() - 0.5) * 3).toFixed(2),
    volume:    Math.floor(Math.random() * 2000000 + 500000),
    oi:        Math.floor(Math.random() * 5000000),
    circuitUp: +(prevClose * 1.2).toFixed(2),
    circuitDn: +(prevClose * 0.8).toFixed(2),
    weekHigh:  +(prevClose * (1 + Math.random() * 0.3)).toFixed(2),
    weekLow:   +(prevClose * (1 - Math.random() * 0.3)).toFixed(2),
    change,
    changePct,
  }
}

/** Mutate a book slightly — simulates a real tick */
function tickBook(book: OrderBook, ltp: number, tickSize: number): OrderBook {
  function mutateLevel(level: DepthLevel, direction: 1 | -1): DepthLevel {
    const priceJitter = (Math.random() < 0.3) ? direction * tickSize * (Math.random() < 0.5 ? 1 : -1) : 0
    const qtyDelta    = Math.floor((Math.random() - 0.45) * 400)
    return {
      price:  Math.max(0.01, +(level.price + priceJitter).toFixed(2)),
      qty:    Math.max(10, level.qty + qtyDelta),
      orders: Math.max(1, level.orders + (Math.random() < 0.2 ? (Math.random() < 0.5 ? 1 : -1) : 0)),
    }
  }
  return {
    bids: book.bids.map(l => mutateLevel(l, -1)).sort((a, b) => b.price - a.price),
    asks: book.asks.map(l => mutateLevel(l,  1)).sort((a, b) => a.price - b.price),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Formats a number with Indian comma system (e.g. 1,23,456) */
function fmtINR(n: number, dec = 2) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

/** Compact volume display (1.2Cr, 45.3L, etc.) */
function fmtVol(n: number) {
  if (n >= 10_000_000) return (n / 10_000_000).toFixed(2) + ' Cr'
  if (n >= 100_000)    return (n / 100_000).toFixed(2) + ' L'
  if (n >= 1_000)      return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

// ── Symbol selector pill ──────────────────────────────────────────────────────
function SymbolPill({
  sym, name, active, onClick,
}: {
  sym: string; name: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:    '5px 12px',
        borderRadius: 7,
        border:     `1px solid ${active ? 'rgba(0,200,83,.3)' : 'var(--border)'}`,
        background: active ? 'rgba(0,200,83,.09)' : 'var(--card)',
        color:      active ? 'var(--accent)' : 'var(--sub)',
        fontSize:   11,
        fontWeight: 600,
        fontFamily: 'JetBrains Mono, monospace',
        cursor:     'pointer',
        transition: 'all .14s',
        whiteSpace: 'nowrap',
      }}
    >
      {sym}
    </button>
  )
}

// ── Single depth row (bid or ask) ─────────────────────────────────────────────
function DepthRow({
  level,
  side,
  maxQty,
  onClickPrice,
}: {
  level:        DepthLevel
  side:         'bid' | 'ask'
  maxQty:       number      // for calculating the background bar width
  onClickPrice: (price: number, side: 'BUY' | 'SELL') => void
}) {
  const isBid    = side === 'bid'
  const barColor = isBid ? 'rgba(0,200,83,.12)' : 'rgba(255,82,82,.12)'
  const pctWidth = Math.min((level.qty / maxQty) * 100, 100)

  return (
    <div
      onClick={() => onClickPrice(level.price, isBid ? 'BUY' : 'SELL')}
      style={{
        display:       'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        alignItems:    'center',
        padding:       '5px 12px',
        cursor:        'pointer',
        position:      'relative',
        borderBottom:  '1px solid rgba(255,255,255,.03)',
        transition:    'background .1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Depth bar behind the row (qty / max) */}
      <div style={{
        position:   'absolute',
        top: 0, bottom: 0,
        // Bids: bar grows from right → left. Asks: left → right.
        right:      isBid ? 0 : 'auto',
        left:       isBid ? 'auto' : 0,
        width:      `${pctWidth}%`,
        background: barColor,
        pointerEvents: 'none',
      }} />

      {/* Price — left col for bids, right col for asks */}
      {isBid ? (
        <>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent)', fontWeight: 600, textAlign: 'left', position: 'relative' }}>
            {fmtINR(level.price)}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text)', textAlign: 'center', position: 'relative' }}>
            {level.qty.toLocaleString('en-IN')}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--sub)', textAlign: 'right', position: 'relative' }}>
            {level.orders}
          </span>
        </>
      ) : (
        <>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--sub)', textAlign: 'left', position: 'relative' }}>
            {level.orders}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text)', textAlign: 'center', position: 'relative' }}>
            {level.qty.toLocaleString('en-IN')}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--red)', fontWeight: 600, textAlign: 'right', position: 'relative' }}>
            {fmtINR(level.price)}
          </span>
        </>
      )}
    </div>
  )
}

// ── Quick order form ──────────────────────────────────────────────────────────
function QuickOrder({
  symbol, exchange, prefillPrice, prefillSide, ltp,
}: {
  symbol:       string
  exchange:     string
  prefillPrice: number
  prefillSide:  'BUY' | 'SELL'
  ltp:          number
}) {
  const [side,      setSide]      = useState<'BUY' | 'SELL'>(prefillSide)
  const [qty,       setQty]       = useState('1')
  const [price,     setPrice]     = useState(String(prefillPrice))
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('LIMIT')
  const [flash,     setFlash]     = useState<'success' | 'error' | null>(null)

  // Sync when parent changes prefill (user clicked a depth row)
  useEffect(() => {
    setSide(prefillSide)
    setPrice(String(prefillPrice))
  }, [prefillPrice, prefillSide])

  const isBuy   = side === 'BUY'
  const qtyNum  = parseInt(qty, 10) || 0
  const priceNum = parseFloat(price) || ltp
  const total   = (qtyNum * priceNum).toFixed(2)

  const handleSubmit = () => {
    // Validate
    if (qtyNum <= 0) { setFlash('error'); setTimeout(() => setFlash(null), 1500); return }

    // In a real app: call useStore(s => s.submitOrder)({ symbol, side, qty: qtyNum, price: priceNum, orderType, exchange })
    // Here we simulate a successful response
    setFlash('success')
    setTimeout(() => setFlash(null), 2000)
  }

  const inputStyle: React.CSSProperties = {
    background:  'var(--card)',
    border:      '1px solid var(--border)',
    borderRadius: 7,
    padding:     '8px 10px',
    color:       'var(--text)',
    fontFamily:  'JetBrains Mono, monospace',
    fontSize:    12,
    outline:     'none',
    width:       '100%',
    transition:  'border-color .14s',
  }

  return (
    <div style={{
      background:   'var(--panel)',
      border:       '1px solid var(--border)',
      borderRadius: 12,
      overflow:     'hidden',
    }}>
      {/* BUY / SELL toggle */}
      <div style={{ display: 'flex' }}>
        {(['BUY', 'SELL'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              flex:       1,
              padding:    '10px',
              border:     'none',
              cursor:     'pointer',
              fontSize:   12,
              fontWeight: 700,
              letterSpacing: .4,
              transition: 'all .14s',
              background: side === s
                ? s === 'BUY' ? 'rgba(0,200,83,.18)' : 'rgba(255,82,82,.18)'
                : 'var(--card)',
              color: side === s
                ? s === 'BUY' ? 'var(--accent)' : 'var(--red)'
                : 'var(--muted)',
              borderBottom: side === s
                ? `2px solid ${s === 'BUY' ? 'var(--accent)' : 'var(--red)'}`
                : '2px solid transparent',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Order type toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['LIMIT', 'MARKET'] as const).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              style={{
                flex:       1,
                padding:    '5px 8px',
                borderRadius: 6,
                border:     `1px solid ${orderType === t ? (isBuy ? 'rgba(0,200,83,.3)' : 'rgba(255,82,82,.3)') : 'var(--border)'}`,
                background: orderType === t ? (isBuy ? 'rgba(0,200,83,.07)' : 'rgba(255,82,82,.07)') : 'transparent',
                color:      orderType === t ? (isBuy ? 'var(--accent)' : 'var(--red)') : 'var(--sub)',
                fontSize:   10,
                fontWeight: 600,
                cursor:     'pointer',
                transition: 'all .14s',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Quantity */}
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6, display: 'block', marginBottom: 4 }}>Qty</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={e => setQty(e.target.value)}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = isBuy ? 'rgba(0,200,83,.5)' : 'rgba(255,82,82,.5)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Price (disabled for MARKET orders) */}
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6, display: 'block', marginBottom: 4 }}>
            Price (₹) {orderType === 'MARKET' && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— at market</span>}
          </label>
          <input
            type="number"
            step="0.05"
            value={orderType === 'MARKET' ? ltp.toFixed(2) : price}
            disabled={orderType === 'MARKET'}
            onChange={e => setPrice(e.target.value)}
            style={{ ...inputStyle, opacity: orderType === 'MARKET' ? 0.5 : 1 }}
            onFocus={e => (e.target.style.borderColor = isBuy ? 'rgba(0,200,83,.5)' : 'rgba(255,82,82,.5)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Total value estimate */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, color: 'var(--sub)' }}>Estimated total</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
            ₹{parseFloat(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          style={{
            padding:      '10px',
            borderRadius: 8,
            border:       'none',
            cursor:       'pointer',
            fontSize:     13,
            fontWeight:   700,
            letterSpacing: .3,
            transition:   'all .18s',
            background: flash === 'success'
              ? 'rgba(0,200,83,.25)'
              : flash === 'error'
              ? 'rgba(255,82,82,.25)'
              : isBuy
              ? 'linear-gradient(135deg, #00a040, var(--accent))'
              : 'linear-gradient(135deg, #c62828, var(--red))',
            color: flash ? (flash === 'success' ? 'var(--accent)' : 'var(--red)') : '#fff',
            boxShadow: flash ? 'none' : isBuy
              ? '0 4px 16px rgba(0,200,83,.2)'
              : '0 4px 16px rgba(255,82,82,.2)',
          }}
        >
          {flash === 'success' ? '✓ Order Placed' : flash === 'error' ? '✕ Invalid Qty' : `${side} ${symbol}`}
        </button>

        {/* Disclaimer */}
        <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>
          Paper trade only · No real money at risk
        </div>
      </div>
    </div>
  )
}

// ── Stat tile (OHLC, circuits, etc.) ─────────────────────────────────────────
function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{sub}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderBookPage() {
  // ── Selected symbol state ──────────────────────────────────────────────────
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selected = SYMBOLS[selectedIdx]

  // ── Quote + book state ─────────────────────────────────────────────────────
  const prevCloseRef = useRef(selected.base)

  const [quote, setQuote] = useState<Quote>(() =>
    generateQuote(selected.base, selected.base)
  )
  const [book, setBook] = useState<OrderBook>(() =>
    generateBook(selected.base, selected.vol < 20 ? 0.05 : 0.5)
  )

  // ── Quick order prefill (set when user clicks a depth row) ─────────────────
  const [prefill, setPrefill] = useState<{ price: number; side: 'BUY' | 'SELL' }>({
    price: selected.base,
    side:  'BUY',
  })

  // ── Live tick simulation ───────────────────────────────────────────────────
  useEffect(() => {
    // Reset state when symbol changes
    prevCloseRef.current = selected.base
    const initialQuote = generateQuote(selected.base, selected.base)
    setQuote(initialQuote)
    setBook(generateBook(initialQuote.ltp, selected.vol < 20 ? 0.05 : 0.5))
    setPrefill({ price: initialQuote.ltp, side: 'BUY' })
  }, [selectedIdx, selected.base, selected.vol])

  useEffect(() => {
    const tickSize = selected.vol < 20 ? 0.05 : 0.5

    const id = setInterval(() => {
      setQuote(prev => {
        // Small random walk on LTP
        const newLtp    = +(prev.ltp * (1 + (Math.random() - 0.499) * 0.0006)).toFixed(2)
        const change    = +(newLtp - prevCloseRef.current).toFixed(2)
        const changePct = +((change / prevCloseRef.current) * 100).toFixed(2)
        return {
          ...prev,
          ltp:    newLtp,
          high:   Math.max(prev.high, newLtp),
          low:    Math.min(prev.low,  newLtp),
          change,
          changePct,
          volume: prev.volume + Math.floor(Math.random() * 2000),
        }
      })

      setBook(prev => tickBook(prev, quote.ltp, tickSize))
    }, 1500)

    return () => clearInterval(id)
  }, [selectedIdx, selected.vol, quote.ltp])

  // ── Derived values for the depth table ────────────────────────────────────
  const totalBidQty = book.bids.reduce((s, l) => s + l.qty, 0)
  const totalAskQty = book.asks.reduce((s, l) => s + l.qty, 0)
  const maxQty      = Math.max(...book.bids.map(l => l.qty), ...book.asks.map(l => l.qty), 1)

  // Imbalance: 0 = full ask pressure, 1 = full bid pressure
  const imbalance = totalBidQty / (totalBidQty + totalAskQty + 0.001)

  const handleClickDepth = useCallback((price: number, side: 'BUY' | 'SELL') => {
    setPrefill({ price, side })
  }, [])

  // ── Spread ────────────────────────────────────────────────────────────────
  const bestBid  = book.bids[0]?.price ?? 0
  const bestAsk  = book.asks[0]?.price ?? 0
  const spread   = +(bestAsk - bestBid).toFixed(2)
  const spreadPct = bestBid > 0 ? +((spread / bestBid) * 100).toFixed(3) : 0

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const isUp = quote.changePct >= 0

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background:    'var(--panel)',
        borderBottom:  '1px solid var(--border)',
        padding:       '16px 24px 12px',
        flexShrink:    0,
      }}>
        {/* Symbol info row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                {selected.sym}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', color: 'var(--sub)', letterSpacing: .5 }}>
                {selected.exch}
              </span>
              {/* Live pulse */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: 'var(--accent)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                LIVE
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--sub)' }}>{selected.name} · Market Depth</div>
          </div>

          {/* LTP + change */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily:  'JetBrains Mono, monospace',
              fontSize:    30,
              fontWeight:  700,
              letterSpacing: -1,
              color:       isUp ? 'var(--accent)' : 'var(--red)',
              lineHeight:  1,
            }}>
              ₹{fmtINR(quote.ltp)}
            </div>
            <div style={{
              fontFamily:  'JetBrains Mono, monospace',
              fontSize:    13,
              marginTop:   4,
              color:       isUp ? 'var(--accent)' : 'var(--red)',
            }}>
              {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{fmtINR(quote.change)} ({isUp ? '+' : ''}{quote.changePct.toFixed(2)}%)
            </div>
            <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
              Prev close ₹{fmtINR(quote.close)}
            </div>
          </div>
        </div>

        {/* Symbol selector scrollable pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {SYMBOLS.map((s, i) => (
            <SymbolPill
              key={s.sym}
              sym={s.sym}
              name={s.name}
              active={i === selectedIdx}
              onClick={() => setSelectedIdx(i)}
            />
          ))}
        </div>
      </div>

      {/* ── Body — 3 columns ────────────────────────────────────────────────── */}
      <div style={{
        flex:      1,
        display:   'grid',
        gridTemplateColumns: '1fr 1fr 300px',
        gap:       0,
        overflow:  'hidden',
        minHeight: 0,
      }}>

        {/* ── Col 1: Bid depth ─────────────────────────────────────────────── */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Column header */}
          <div style={{
            display:      'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            padding:      '8px 12px',
            borderBottom: '1px solid var(--border)',
            background:   'var(--panel)',
          }}>
            {['Price', 'Qty', 'Orders'].map(h => (
              <span key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6 }}>
                {h}
              </span>
            ))}
          </div>

          {/* Section label */}
          <div style={{ padding: '8px 12px 4px', background: 'rgba(0,200,83,.04)', borderBottom: '1px solid rgba(0,200,83,.08)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: .4 }}>BID (Buy Orders)</span>
          </div>

          {/* Bid rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {book.bids.map((level, i) => (
              <DepthRow
                key={i}
                level={level}
                side="bid"
                maxQty={maxQty}
                onClickPrice={handleClickDepth}
              />
            ))}
          </div>

          {/* Total bid qty */}
          <div style={{
            padding:       '10px 12px',
            borderTop:     '1px solid var(--border)',
            background:    'var(--panel)',
            display:       'flex',
            justifyContent: 'space-between',
            alignItems:    'center',
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6 }}>Total Bid Qty</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
              {totalBidQty.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* ── Col 2: Ask depth + spread + imbalance ────────────────────────── */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Column header (reversed for asks) */}
          <div style={{
            display:      'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            padding:      '8px 12px',
            borderBottom: '1px solid var(--border)',
            background:   'var(--panel)',
          }}>
            {['Orders', 'Qty', 'Price'].map(h => (
              <span key={h} style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6, textAlign: h === 'Price' ? 'right' : 'left' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Section label */}
          <div style={{ padding: '8px 12px 4px', background: 'rgba(255,82,82,.04)', borderBottom: '1px solid rgba(255,82,82,.08)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', letterSpacing: .4 }}>ASK (Sell Orders)</span>
          </div>

          {/* Ask rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {book.asks.map((level, i) => (
              <DepthRow
                key={i}
                level={level}
                side="ask"
                maxQty={maxQty}
                onClickPrice={handleClickDepth}
              />
            ))}
          </div>

          {/* Total ask qty */}
          <div style={{
            padding:       '10px 12px',
            borderTop:     '1px solid var(--border)',
            background:    'var(--panel)',
            display:       'flex',
            justifyContent: 'space-between',
            alignItems:    'center',
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6 }}>Total Ask Qty</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
              {totalAskQty.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* ── Col 3: Right rail — stats + imbalance + order form ─────────────── */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>

          {/* Spread */}
          <div style={{
            background:   'var(--panel)',
            border:       '1px solid var(--border)',
            borderRadius: 10,
            padding:      '12px 14px',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>Spread</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>
                  ₹{fmtINR(spread)}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--sub)', marginTop: 1 }}>
                  {spreadPct}%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 2 }}>Best Bid</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>₹{fmtINR(bestBid)}</div>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 6, marginBottom: 2 }}>Best Ask</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>₹{fmtINR(bestAsk)}</div>
              </div>
            </div>
          </div>

          {/* Bid/Ask imbalance bar */}
          <div style={{
            background:   'var(--panel)',
            border:       '1px solid var(--border)',
            borderRadius: 10,
            padding:      '12px 14px',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10 }}>
              Depth Imbalance
            </div>

            {/* Labelled bar */}
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ flex: imbalance, background: 'var(--accent)', transition: 'flex .4s ease' }} />
              <div style={{ flex: 1 - imbalance, background: 'var(--red)', transition: 'flex .4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--accent)' }}>
                {(imbalance * 100).toFixed(1)}% Bid
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--red)' }}>
                {((1 - imbalance) * 100).toFixed(1)}% Ask
              </span>
            </div>
            {/* Interpretation hint */}
            <div style={{ marginTop: 8, padding: '6px 9px', borderRadius: 6, background: imbalance > 0.55 ? 'rgba(0,200,83,.07)' : imbalance < 0.45 ? 'rgba(255,82,82,.07)' : 'rgba(255,215,64,.07)', border: `1px solid ${imbalance > 0.55 ? 'rgba(0,200,83,.15)' : imbalance < 0.45 ? 'rgba(255,82,82,.15)' : 'rgba(255,215,64,.15)'}` }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: imbalance > 0.55 ? 'var(--accent)' : imbalance < 0.45 ? 'var(--red)' : 'var(--yellow)' }}>
                {imbalance > 0.55 ? '▲ Buy pressure dominant' : imbalance < 0.45 ? '▼ Sell pressure dominant' : '● Balanced market depth'}
              </span>
            </div>
          </div>

          {/* OHLC + stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatTile label="Open"    value={`₹${fmtINR(quote.open)}`} />
            <StatTile label="Prev Close" value={`₹${fmtINR(quote.close)}`} />
            <StatTile label="Day High" value={`₹${fmtINR(quote.high)}`} color="var(--accent)" />
            <StatTile label="Day Low"  value={`₹${fmtINR(quote.low)}`}  color="var(--red)" />
            <StatTile label="ATP"      value={`₹${fmtINR(quote.atp)}`}  sub="Avg Trade Price" />
            <StatTile label="Volume"   value={fmtVol(quote.volume)} />
            <StatTile label="52W High" value={`₹${fmtINR(quote.weekHigh)}`} color="var(--accent)" />
            <StatTile label="52W Low"  value={`₹${fmtINR(quote.weekLow)}`}  color="var(--red)" />
            <StatTile label="Ckt Up"   value={`₹${fmtINR(quote.circuitUp)}`}  sub="Upper Circuit" />
            <StatTile label="Ckt Dn"   value={`₹${fmtINR(quote.circuitDn)}`}  sub="Lower Circuit" color="var(--red)" />
          </div>

          {/* Quick Order form — prefilled from clicking depth rows */}
          <QuickOrder
            symbol={selected.sym}
            exchange={selected.exch}
            prefillPrice={prefill.price}
            prefillSide={prefill.side}
            ltp={quote.ltp}
          />
        </div>
      </div>

      {/* ── Global pulse keyframe (same as rest of app) ──────────────────── */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .3 } }
      `}</style>
    </div>
  )
}
