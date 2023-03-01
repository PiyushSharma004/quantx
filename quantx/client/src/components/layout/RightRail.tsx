// ── Right Rail ────────────────────────────────────────────────────────────────
import { useEffect } from 'react'
import {
  useStore,
  useInstruments,
  useNews,
  useWatchlist,
  useWatchlistQuotes,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useFetchWatchlist,
} from '../../hooks'
import { AsyncView } from '../ui'
import type { NewsItem, WatchlistItem, LiveQuote } from '../../types'

function NewsRow({ item }: { item: NewsItem }) {
  const color = item.sentiment === 'bullish' ? 'var(--accent)' : item.sentiment === 'bearish' ? 'var(--red)' : 'var(--yellow)'
  const label = item.sentiment === 'bullish' ? '▲ BULLISH' : item.sentiment === 'bearish' ? '▼ BEARISH' : '● NEUTRAL'
  const mins  = Math.round((Date.now() - new Date(item.publishedAt).getTime()) / 60000)
  const ago   = mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 8, fontWeight: 700, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', color: 'var(--sub)' }}>{item.source}</span>
        <span style={{ fontSize: 8, color: 'var(--muted)', marginLeft: 'auto' }}>{ago}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.45, cursor: 'pointer' }}>{item.title}</div>
      <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 700, marginTop: 4, padding: '1px 5px', borderRadius: 3, background: `${color}15`, color }}>{label}</span>
    </div>
  )
}

function WatchRow({
  item,
  quote,
  onRemove,
}: {
  item:     WatchlistItem
  quote:    LiveQuote | undefined
  onRemove: (id: string) => void
}) {
  const up    = (quote?.changePct ?? item.alertPrice ? 0 : 0) >= 0
  const price = quote?.price
  const pct   = quote?.changePct

  // Use live changePct sign to determine color
  const isUp  = (pct ?? 0) >= 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px', borderRadius: 7, cursor: 'pointer',
      marginBottom: 2, border: '1px solid transparent',
      transition: 'background .14s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--card)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>{item.symbol}</div>
        <div style={{ fontSize: 9, color: 'var(--sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: price ? (isUp ? 'var(--accent)' : 'var(--red)') : 'var(--sub)' }}>
          {price ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
        </div>
        {pct !== undefined && (
          <div style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, marginTop: 2, background: isUp ? 'rgba(0,200,83,.08)' : 'rgba(255,82,82,.08)', color: isUp ? 'var(--accent)' : 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>
            {isUp ? '+' : ''}{pct.toFixed(2)}%
          </div>
        )}
      </div>
      {/* Remove button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(item.id) }}
        title="Remove"
        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
        onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--red)'}
        onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--muted)'}
      >✕</button>
    </div>
  )
}

export default function RightRail() {
  const instruments       = useInstruments()
  const news              = useNews()
  const fetchNews         = useStore(s => s.fetchNews)
  const watchlist         = useWatchlist()
  const watchlistQuotes   = useWatchlistQuotes()
  const addToWatchlist    = useAddToWatchlist()
  const removeFromWatchlist = useRemoveFromWatchlist()
  const fetchWatchlist    = useFetchWatchlist()
  const fetchWatchlistQuotes = useStore(s => s.fetchWatchlistQuotes)

  useEffect(() => {
    fetchNews()
    fetchWatchlist()
    fetchWatchlistQuotes()
  }, [fetchNews, fetchWatchlist, fetchWatchlistQuotes])

  return (
    <aside style={{ width: 280, flexShrink: 0, background: 'var(--sidebar)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Watchlist ──────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)' }}>
            Watchlist
            {(watchlist.data?.length ?? 0) > 0 && (
              <span style={{ marginLeft: 6, fontFamily: 'JetBrains Mono, monospace', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 5px', fontSize: 9, color: 'var(--text)' }}>
                {watchlist.data!.length}
              </span>
            )}
          </div>
          {/* Quick-add the first non-watched instrument */}
          <button
            onClick={() => {
              const unwatched = instruments.find(i => !watchlist.data?.find(w => w.symbol === i.symbol))
              if (unwatched) addToWatchlist(unwatched.symbol, unwatched.exchange)
            }}
            title="Add next instrument to watchlist"
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', fontSize: 10, color: 'var(--sub)', cursor: 'pointer' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--accent)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--sub)' }}
          >+ Add</button>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 200 }}>
          <AsyncView {...watchlist}>
            {(items) =>
              items.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '14px 0' }}>
                  No symbols yet — click + Add
                </div>
              ) : (
                <>
                  {items.map(item => (
                    <WatchRow
                      key={item.id}
                      item={item}
                      quote={watchlistQuotes.get(item.symbol)}
                      onRemove={removeFromWatchlist}
                    />
                  ))}
                </>
              )
            }
          </AsyncView>
        </div>
      </div>

      {/* ── Kite status ─────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)', marginBottom: 10 }}>Zerodha Kite</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,200,83,.05)', border: '1px solid rgba(0,200,83,.15)', borderRadius: 8, padding: '9px 11px', marginBottom: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Connected</div>
            <div style={{ fontSize: 9, color: 'var(--sub)' }}>sandbox · read-only mode</div>
          </div>
        </div>
        {['API Key', 'Access Token'].map(lbl => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--sub)', width: 80, flexShrink: 0 }}>{lbl}</div>
            <input readOnly defaultValue={lbl === 'API Key' ? 'qx_demo_••••••' : '••••••••••••••••'} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, outline: 'none' }} />
          </div>
        ))}
        <button style={{ width: '100%', marginTop: 8, padding: 7, borderRadius: 7, background: 'rgba(0,200,83,.08)', border: '1px solid rgba(0,200,83,.2)', color: 'var(--accent)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>↻ Reconnect</button>
      </div>

      {/* ── News ─────────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)', padding: '14px 16px 6px' }}>Market News</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <AsyncView {...news}>
          {(items) => <>{items.map(item => <NewsRow key={item.id} item={item} />)}</>}
        </AsyncView>
      </div>
    </aside>
  )
}


