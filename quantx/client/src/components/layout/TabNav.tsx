// ── TabNav ────────────────────────────────────────────────────────────────────
import { useActiveTab, useSetActiveTab } from '../../hooks'
import type { TabId } from '../../types'

const TABS: { id: TabId; label: string }[] = [
  { id: 'portfolio',  label: 'Portfolio' },
  { id: 'paper',      label: 'Paper Trading' },
  { id: 'charts',     label: '📈 Charts' },
  { id: 'news',       label: '📰 News' },
  { id: 'ai',         label: 'AI Predict' },
  { id: 'watchlist',  label: '☆ Watchlist' },
  { id: 'orderbook',  label: '▤ Order Book' },
]

export default function TabNav() {
  const active    = useActiveTab()
  const setActive = useSetActiveTab()

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 24px', background: 'var(--panel)', borderBottom: '1px solid var(--border)', height: 42, flexShrink: 0, overflowX: 'auto' }}>
      {TABS.map(t => (
        <div
          key={t.id}
          onClick={() => setActive(t.id)}
          style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
            color:      active === t.id ? 'var(--accent)' : 'var(--sub)',
            background: active === t.id ? 'rgba(0,200,83,.09)' : 'transparent',
            border:     `1px solid ${active === t.id ? 'rgba(0,200,83,.2)' : 'transparent'}`,
            transition: 'all .14s',
          }}
        >
          {t.label}
        </div>
      ))}
    </nav>
  )
}