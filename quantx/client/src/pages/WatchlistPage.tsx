// ── Watchlist Page ────────────────────────────────────────────────────────────
// Features:
//  • Search + add any symbol to watchlist
//  • Live price column (from Twelve Data or WS mock ticks)
//  • Remove individual symbols
//  • Set/clear a price alert
//  • Live API source badge (Twelve Data vs Mock)
//  • Auto-refreshes quotes every 15 seconds

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  useStore,
  useWatchlist,
  useWatchlistQuotes,
  useFetchWatchlist,
  useFetchWatchlistQuotes,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useUpdateWatchlistItem,
  useLivePriceStatus,
  useFetchLivePriceStatus,
} from '../hooks'
import { AsyncView } from '../components/ui'
import type { WatchlistItem, LiveQuote } from '../types'

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceBadge({ source, reachable }: { source: string; reachable: boolean }) {
  const isLive = source === 'twelve_data' && reachable
  const color  = isLive ? 'var(--accent)' : 'var(--yellow)'
  const label  = isLive ? '● Twelve Data LIVE' : '● Mock Simulator'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: `${color}10`, border: `1px solid ${color}30`,
      borderRadius: 20, padding: '3px 10px',
      fontSize: 10, fontWeight: 600, color, letterSpacing: .3,
    }}>
      {label}
    </div>
  )
}

function AddSymbolBar({
  onAdd,
  loading,
}: {
  onAdd: (sym: string, exchange: string) => void
  loading: boolean
}) {
  const [sym, setSym]       = useState('')
  const [exch, setExch]     = useState('NSE')
  const [focused, setFocus] = useState(false)

  const submit = () => {
    const s = sym.trim().toUpperCase()
    if (!s) return
    onAdd(s, exch)
    setSym('')
  }

  const inp: React.CSSProperties = {
    background: 'var(--card)', border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8, padding: '9px 12px', color: 'var(--text)',
    fontFamily: 'Inter, sans-serif', fontSize: 13, outline: 'none',
    transition: 'border-color .14s',
  }

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 20px',
      display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 160px' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6 }}>Symbol</label>
        <input
          style={{ ...inp, textTransform: 'uppercase' }}
          placeholder="e.g. WIPRO"
          value={sym}
          onChange={e => setSym(e.target.value.toUpperCase())}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6 }}>Exchange</label>
        <select
          value={exch}
          onChange={e => setExch(e.target.value)}
          style={{ ...inp, cursor: 'pointer', paddingRight: 20 }}
        >
          <option>NSE</option>
          <option>BSE</option>
          <option>NFO</option>
          <option>MCX</option>
        </select>
      </div>
      <button
        onClick={submit}
        disabled={loading || !sym.trim()}
        style={{
          padding: '9px 20px', borderRadius: 8, border: 'none', cursor: sym.trim() ? 'pointer' : 'not-allowed',
          background: sym.trim() ? 'linear-gradient(135deg,#00a040,#00c853)' : 'var(--card)',
          color: sym.trim() ? '#fff' : 'var(--sub)',
          fontSize: 13, fontWeight: 600, transition: 'all .16s',
          opacity: loading ? .6 : 1,
        }}
      >
        {loading ? '…' : '+ Add to Watchlist'}
      </button>
    </div>
  )
}

function AlertInput({
  item,
  onSave,
}: {
  item: WatchlistItem
  onSave: (id: string, price: number | null) => void
}) {
  const [val, setVal]     = useState(item.alertPrice?.toString() ?? '')
  const [edit, setEdit]   = useState(false)
  const inputRef          = useRef<HTMLInputElement>(null)

  useEffect(() => { if (edit) inputRef.current?.focus() }, [edit])

  const save = () => {
    const n = parseFloat(val)
    onSave(item.id, isNaN(n) ? null : n)
    setEdit(false)
  }

  if (!edit) {
    return (
      <span
        onClick={() => setEdit(true)}
        title="Click to set price alert"
        style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: item.alertPrice ? 'var(--yellow)' : 'var(--muted)',
          cursor: 'pointer', borderBottom: '1px dashed currentColor',
        }}
      >
        {item.alertPrice ? `₹${item.alertPrice.toLocaleString('en-IN')}` : '—'}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <input
        ref={inputRef}
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEdit(false) }}
        style={{
          width: 72, background: 'var(--card)', border: '1px solid var(--accent)',
          borderRadius: 5, padding: '2px 6px', color: 'var(--text)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, outline: 'none',
        }}
        placeholder="price"
      />
      <button onClick={save} style={{ padding: '2px 6px', borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✓</button>
      <button onClick={() => setEdit(false)} style={{ padding: '2px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--sub)', fontSize: 10, cursor: 'pointer' }}>✕</button>
    </div>
  )
}

function WatchlistRow({
  item,
  quote,
  onRemove,
  onSaveAlert,
}: {
  item:         WatchlistItem
  quote:        LiveQuote | undefined
  onRemove:     (id: string) => void
  onSaveAlert:  (id: string, price: number | null) => void
}) {
  const up      = (quote?.changePct ?? 0) >= 0
  const price   = quote?.price
  const chgPct  = quote?.changePct
  const chgAbs  = quote?.change

  // Determine if price crossed alert
  const alertTriggered = item.alertPrice && price
    ? (up ? price >= item.alertPrice : price <= item.alertPrice)
    : false

  return (
    <tr style={{ borderBottom: '1px solid var(--border)', cursor: 'default' }}>
      {/* Symbol */}
      <td style={{ padding: '13px 0' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          {item.symbol}
        </div>
        <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 1 }}>{item.name}</div>
      </td>

      {/* Exchange */}
      <td style={{ padding: '13px 0', textAlign: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px', color: 'var(--sub)', letterSpacing: .5 }}>
          {item.exchange}
        </span>
      </td>

      {/* Price */}
      <td style={{ padding: '13px 0', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: price ? (up ? 'var(--accent)' : 'var(--red)') : 'var(--muted)' }}>
        {price ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
      </td>

      {/* Change */}
      <td style={{ padding: '13px 0', textAlign: 'right' }}>
        {chgAbs !== undefined && chgPct !== undefined ? (
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: up ? 'var(--accent)' : 'var(--red)' }}>
              {up ? '+' : ''}{chgAbs.toFixed(2)}
            </div>
            <div style={{ fontSize: 10, background: up ? 'rgba(0,200,83,.09)' : 'rgba(255,82,82,.09)', color: up ? 'var(--accent)' : 'var(--red)', borderRadius: 4, padding: '1px 5px', marginTop: 2, display: 'inline-block', fontFamily: 'JetBrains Mono, monospace' }}>
              {up ? '+' : ''}{chgPct.toFixed(2)}%
            </div>
          </div>
        ) : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
      </td>

      {/* Day Range */}
      <td style={{ padding: '13px 0', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--sub)' }}>
        {quote ? (
          <>
            <div>{`₹${quote.low.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</div>
            <div style={{ color: 'var(--text)' }}>{`₹${quote.high.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</div>
          </>
        ) : '—'}
      </td>

      {/* Alert */}
      <td style={{ padding: '13px 0', textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
          {alertTriggered && (
            <span title="Alert triggered!" style={{ fontSize: 12 }}>🔔</span>
          )}
          <AlertInput item={item} onSave={onSaveAlert} />
        </div>
      </td>

      {/* Source */}
      <td style={{ padding: '13px 0', textAlign: 'center' }}>
        <span style={{
          fontSize: 8, fontWeight: 700, letterSpacing: .3,
          color: quote?.source === 'twelve_data' ? 'var(--accent)' : 'var(--sub)',
        }}>
          {quote?.source === 'twelve_data' ? 'TD' : 'MOCK'}
        </span>
      </td>

      {/* Remove */}
      <td style={{ padding: '13px 0', textAlign: 'right' }}>
        <button
          onClick={() => onRemove(item.id)}
          title="Remove from watchlist"
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 5, padding: '3px 8px', color: 'var(--sub)',
            fontSize: 11, cursor: 'pointer', transition: 'all .14s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--red)'; (e.target as HTMLElement).style.color = 'var(--red)' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--sub)' }}
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WatchlistPage() {
  const watchlist          = useWatchlist()
  const quotes             = useWatchlistQuotes()
  const fetchWatchlist     = useFetchWatchlist()
  const fetchQuotes        = useFetchWatchlistQuotes()
  const addToWatchlist     = useAddToWatchlist()
  const removeFromWatchlist = useRemoveFromWatchlist()
  const updateItem         = useUpdateWatchlistItem()
  const livePriceStatus    = useLivePriceStatus()
  const fetchLivePriceStatus = useFetchLivePriceStatus()
  const [adding, setAdding] = useState(false)

  // Bootstrap
  useEffect(() => {
    fetchWatchlist()
    fetchQuotes()
    fetchLivePriceStatus()
  }, [fetchWatchlist, fetchQuotes, fetchLivePriceStatus])

  // Auto-refresh quotes every 15 seconds
  useEffect(() => {
    const id = setInterval(fetchQuotes, 15_000)
    return () => clearInterval(id)
  }, [fetchQuotes])

  const handleAdd = useCallback(async (sym: string, exch: string) => {
    setAdding(true)
    await addToWatchlist(sym, exch)
    // Refresh quotes to include the new symbol
    await fetchQuotes()
    setAdding(false)
  }, [addToWatchlist, fetchQuotes])

  const handleSaveAlert = useCallback((id: string, price: number | null) => {
    updateItem(id, { alertPrice: price })
  }, [updateItem])

  const TH = ({ children, right = false, center = false }: { children: React.ReactNode; right?: boolean; center?: boolean }) => (
    <th style={{
      textAlign: center ? 'center' : right ? 'right' : 'left',
      fontSize: 9, fontWeight: 700, color: 'var(--sub)',
      textTransform: 'uppercase', letterSpacing: .7,
      padding: '0 0 10px', borderBottom: '1px solid var(--border)',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  )

  const statusData = livePriceStatus.data

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'var(--panel)', borderBottom: '1px solid var(--border)',
        padding: '20px 24px 16px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 }}>
              My Watchlist
            </h3>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
              {watchlist.data?.length ?? 0} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--sub)' }}>symbols tracked</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 4 }}>
              Prices refresh every 15 seconds · Click alert cell to set a price alert
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {statusData && (
              <SourceBadge source={statusData.source} reachable={statusData.reachable} />
            )}
            <button
              onClick={fetchQuotes}
              style={{
                padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
                background: 'var(--card)', color: 'var(--sub)', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', transition: 'all .14s',
              }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text)'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--sub)'}
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        {/* Add bar */}
        <AddSymbolBar onAdd={handleAdd} loading={adding} />
      </div>

      {/* API status info bar */}
      {statusData && !statusData.keyPresent && (
        <div style={{
          background: 'rgba(255,215,64,.06)', borderBottom: '1px solid rgba(255,215,64,.15)',
          padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 11, color: 'var(--yellow)',
        }}>
          <span style={{ fontSize: 14 }}>💡</span>
          <span>
            <strong>Using mock prices.</strong> To get real NSE live prices, set{' '}
            <code style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(255,215,64,.1)', padding: '1px 5px', borderRadius: 3 }}>
              TWELVE_DATA_API_KEY
            </code>{' '}
            in your <code style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(255,215,64,.1)', padding: '1px 5px', borderRadius: 3 }}>.env</code>{' '}
            file.{' '}
            <a href="https://twelvedata.com/register" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Get a free key →
            </a>
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ padding: '20px 24px', flex: 1 }}>
        <AsyncView {...watchlist}>
          {(items) => (
            items.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 0', color: 'var(--sub)', gap: 12,
              }}>
                <div style={{ fontSize: 40 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Your watchlist is empty</div>
                <div style={{ fontSize: 12 }}>Use the search bar above to add symbols like RELIANCE, TCS, INFY…</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <TH>Symbol</TH>
                    <TH center>Exchange</TH>
                    <TH right>Price</TH>
                    <TH right>Change</TH>
                    <TH right>Day Range (L/H)</TH>
                    <TH right>Alert Price</TH>
                    <TH center>Source</TH>
                    <TH right>Remove</TH>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <WatchlistRow
                      key={item.id}
                      item={item}
                      quote={quotes.get(item.symbol)}
                      onRemove={removeFromWatchlist}
                      onSaveAlert={handleSaveAlert}
                    />
                  ))}
                </tbody>
              </table>
            )
          )}
        </AsyncView>
      </div>
    </div>
  )
}
