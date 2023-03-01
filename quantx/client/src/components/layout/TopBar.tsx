// ── TopBar ────────────────────────────────────────────────────────────────────
import { useClock, useSummary } from '../../hooks'
import { fmtINR } from '../../utils/chart'
import { AsyncView } from '../ui'

export default function TopBar() {
  const clock   = useClock()
  const summary = useSummary()

  return (
    <div style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <AsyncView {...summary}>
        {(s) => (
          <>
            {[
              { label: 'Total Value',  value: `₹${fmtINR(s.totalValue, 0)}`,                                          cls: '' },
              { label: 'Today',        value: `${s.todayPnl >= 0 ? '+' : ''}₹${fmtINR(Math.abs(s.todayPnl), 0)} (${s.todayPnl >= 0 ? '+' : ''}${s.todayPnlPct.toFixed(2)}%)`, cls: s.todayPnl >= 0 ? 'pos' : 'neg' },
              { label: 'Buying Power', value: `₹${fmtINR(s.buyingPower, 0)}`,                                         cls: '' },
            ].map(stat => (
              <div key={stat.label} style={{ paddingRight: 28, borderRight: '1px solid var(--border)', marginRight: 28 }}>
                <div style={{ fontSize: 10, color: 'var(--sub)', fontWeight: 500, marginBottom: 3 }}>{stat.label}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 600, letterSpacing: -0.5,
                  color: stat.cls === 'pos' ? 'var(--accent)' : stat.cls === 'neg' ? 'var(--red)' : 'var(--text)',
                }}>{stat.value}</div>
              </div>
            ))}
          </>
        )}
      </AsyncView>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,200,83,.08)', border: '1px solid rgba(0,200,83,.2)', borderRadius: 20, padding: '4px 11px', fontSize: 10, color: 'var(--accent)', fontWeight: 600, letterSpacing: .3 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
          NSE LIVE
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--sub)' }}>{clock}</div>
      </div>
    </div>
  )
}
