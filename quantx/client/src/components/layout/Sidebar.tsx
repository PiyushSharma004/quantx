// ── Sidebar ───────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import { useActiveTab, useSetActiveTab, useInstruments, useWatchlist, useFetchWatchlist } from '../../hooks'
import type { TabId } from '../../types'

const NAV: { id: TabId; icon: string; label: string; badge?: string; countKey?: string }[] = [
  { id: 'portfolio',  icon: '◈', label: 'Portfolio' },
  { id: 'paper',      icon: '◎', label: 'Paper Trade',  badge: 'NEW' },
  { id: 'charts',     icon: '⊞', label: 'Trading Chart' },
  { id: 'news',       icon: '◑', label: 'Market News',  badge: 'LIVE' },
  { id: 'ai',         icon: '◉', label: 'AI Predict' },
  { id: 'watchlist',  icon: '☆', label: 'Watchlist',    countKey: 'watchlist' },
  { id: 'orderbook',  icon: '▤', label: 'Order Book' },
]

const SEGMENTS = [
  { icon: '▣', label: 'Equity' },
  { icon: '▦', label: 'F&O' },
  { icon: '▤', label: 'Commodity' },
  { icon: '▥', label: 'Currency' },
]

function MiniSpark({ positive }: { positive: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const pts = Array.from({ length: 20 }, (_, i) =>
      `${i * 5},${12 + (Math.random() - (positive ? 0.35 : 0.65)) * 8}`
    ).join(' ')
    ref.current.innerHTML = `<polyline points="${pts}" fill="none"
      stroke="${positive ? 'var(--accent)' : 'var(--red)'}"
      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`
  }, [positive])
  return <svg ref={ref} viewBox="0 0 100 24" preserveAspectRatio="none" style={{ height: 24, width: '100%', marginTop: 6 }} />
}

export default function Sidebar() {
  const activeTab    = useActiveTab()
  const setActiveTab = useSetActiveTab()
  const instruments  = useInstruments()
  const [nifty, bn]  = instruments
  const watchlist    = useWatchlist()
  const fetchWatchlist = useFetchWatchlist()
  const watchCount   = watchlist.data?.length ?? 0

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  const s: Record<string, React.CSSProperties> = {
    sidebar:     { width: 220, flexShrink: 0, background: 'var(--sidebar)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflowY: 'auto' },
    logo:        { padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' },
    logoIcon:    { width: 34, height: 34, background: 'var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: '#000', flexShrink: 0 },
    logoText:    { fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.4 },
    search:      { margin: '14px 14px 4px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 12px' },
    searchInput: { background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'Inter, sans-serif', fontSize: 12, flex: 1, outline: 'none' },
    secLabel:    { fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: 'var(--muted)', padding: '0 6px', marginBottom: 6 },
    indices:     { marginTop: 'auto', padding: 14, borderTop: '1px solid var(--border)' },
    tile:        { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', marginBottom: 8, cursor: 'pointer' },
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoIcon}>Q</div>
        <div>
          <div style={s.logoText}>QuantX</div>
          <div style={{ fontSize: 9, color: 'var(--sub)', fontWeight: 600, letterSpacing: .3 }}>India · AI Trading</div>
        </div>
      </div>

      <div style={s.search}>
        <span style={{ fontSize: 13, color: 'var(--sub)' }}>⌕</span>
        <input style={s.searchInput} placeholder="Search symbol…" />
      </div>

      <div style={{ padding: '18px 14px 6px' }}>
        <div style={s.secLabel}>Platform</div>
        {NAV.map(item => {
          const isActive = activeTab === item.id
          const count    = item.countKey === 'watchlist' ? watchCount : 0
          return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                color:      isActive ? 'var(--accent)' : 'var(--sub)',
                background: isActive ? 'rgba(0,200,83,.08)' : 'transparent',
                border:     `1px solid ${isActive ? 'rgba(0,200,83,.2)' : 'transparent'}`,
                transition: 'all .14s', marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ background: item.badge === 'LIVE' ? 'rgba(255,82,82,.15)' : 'var(--accent)', color: item.badge === 'LIVE' ? 'var(--red)' : '#000', borderRadius: 8, fontSize: 8, fontWeight: 700, padding: '1px 5px' }}>
                  {item.badge}
                </span>
              )}
              {count > 0 && !item.badge && (
                <span style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 9, padding: '0 5px', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {count}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ padding: '14px 14px 6px' }}>
        <div style={s.secLabel}>Segments</div>
        {SEGMENTS.map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--sub)', transition: 'all .14s', marginBottom: 2 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--sub)' }}
          >
            <span>{seg.icon}</span><span>{seg.label}</span>
          </div>
        ))}
      </div>

      <div style={s.indices}>
        {[
          { sym: 'NIFTY 50', val: nifty?.ltp?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '22,410.30', chg: nifty?.changePct ?? 0.58 },
          { sym: 'BANKNIFTY', val: bn?.ltp?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '48,210.55', chg: bn?.changePct ?? -0.17 },
        ].map(idx => (
          <div key={idx.sym} style={s.tile}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)' }}>{idx.sym}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600, marginTop: 2 }}>{idx.val}</div>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: idx.chg >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {idx.chg >= 0 ? '▲' : '▼'} {Math.abs(idx.chg).toFixed(2)}%
            </div>
            <MiniSpark positive={idx.chg >= 0} />
          </div>
        ))}
      </div>
    </aside>
  )
}
