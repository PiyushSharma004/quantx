// ── Portfolio Page ────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, LineController } from 'chart.js'
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, LineController)
import { useStore, useHoldings, useSummary, useTimeLabels, useOHLCVSeries } from '../hooks/index'
import { AsyncView } from '../components/ui/index'
import { fmtINR, CHART_OPTIONS, GRID_STYLE, TICK_STYLE } from '../utils/chart'
import type { Holding } from '../types/index'


const TIME_PILLS = ['1D','1W','1M','3M','1Y','All']

function PerfChart() {
  const ref   = useRef<HTMLCanvasElement>(null)
  const data   = useOHLCVSeries(60, 470000, 5000, 100)
  const labels = useTimeLabels(180, 'date').filter((_, i) => i % 3 === 0)

  useEffect(() => {
  const ctx = ref.current?.getContext('2d')
  if (!ctx) return
  const existing = ChartJS.getChart(ctx)
  if (existing) existing.destroy()
  const chart = new ChartJS(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: '#00c853', borderWidth: 2, pointRadius: 0, tension: .4, fill: true,
      backgroundColor: (c) => { const g = c.chart.ctx.createLinearGradient(0,0,0,140); g.addColorStop(0,'rgba(0,200,83,.18)'); g.addColorStop(1,'rgba(0,200,83,0)'); return g }
    }] },
    options: { ...CHART_OPTIONS, scales: {
      x: { grid: { color: GRID_STYLE.color }, ticks: { ...TICK_STYLE, maxTicksLimit: 6 } as never },
      y: { grid: { color: GRID_STYLE.color }, ticks: { ...TICK_STYLE, callback: (v) => `Rs.${(+v/100000).toFixed(1)}L` } as never },
    }},
  })
  return () => chart.destroy()
}, [])
}
function HoldingRow({ h, onSell }: { h: Holding; onSell: (sym: string) => void }) {
  const up = h.totalPnl >= 0
  const td = h.todayPnl >= 0
  return (
    <tr>
      <td style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{h.symbol}</div>
        <div style={{ fontSize: 10, color: 'var(--sub)', marginTop: 1 }}>{h.name}</div>
      </td>
      <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text)' }}>{h.qty}</td>
      <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text)' }}>₹{fmtINR(h.currentValue, 0)}</td>
      <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: td ? 'var(--accent)' : 'var(--red)' }}>
        {td?'+':''}₹{fmtINR(Math.abs(h.todayPnl),0)} ({td?'+':''}{h.todayPnlPct.toFixed(2)}%)
      </td>
      <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: up ? 'var(--accent)' : 'var(--red)' }}>
        {up?'+':''}₹{fmtINR(Math.abs(h.totalPnl),0)} ({up?'+':''}{h.totalPnlPct.toFixed(2)}%)
      </td>
      <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text)' }}>₹{fmtINR(h.ltp)}</td>
      <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
        <span onClick={() => onSell(h.symbol)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 10, fontWeight: 600, color: 'var(--sub)', cursor: 'pointer' }}>Sell</span>
      </td>
    </tr>
  )
}

export default function PortfolioPage() {
  const [pill, setPill]     = useState('1W')
  const fetchPortfolio      = useStore(s => s.fetchPortfolio)
  const showToast           = useStore(s => s.showToast)
  const summary             = useSummary()
  const holdings            = useHoldings()

  useEffect(() => { fetchPortfolio() }, [fetchPortfolio])

  const handleSell = (sym: string) => showToast(`SELL ${sym} — Order placed`, '#ff5252')

  const TH = ({ children, right = false }: { children: string; right?: boolean }) => (
    <th style={{ textAlign: right ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .6, padding: '0 0 10px', borderBottom: '1px solid var(--border)' }}>
      {children}
    </th>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Chart hero */}
      <div style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '20px 24px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 }}>Portfolio Performance</h3>
            <AsyncView {...summary}>
              {(s) => <>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 600, letterSpacing: -1 }}>₹{fmtINR(s.totalValue, 0)}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, marginTop: 2, color: s.todayPnl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                  {s.todayPnl >= 0 ? '▲' : '▼'} {s.todayPnl >= 0 ? '+' : ''}₹{fmtINR(Math.abs(s.todayPnl), 0)} ({s.todayPnl >= 0 ? '+' : ''}{s.todayPnlPct.toFixed(2)}%) Today
                </div>
              </>}
            </AsyncView>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {TIME_PILLS.map(p => (
              <div key={p} onClick={() => setPill(p)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', color: pill===p ? 'var(--accent)' : 'var(--sub)', background: pill===p ? 'rgba(0,200,83,.10)' : 'var(--card)', border: `1px solid ${pill===p ? 'rgba(0,200,83,.25)' : 'var(--border)'}`, transition: 'all .14s' }}>{p}</div>
            ))}
          </div>
        </div>
        <div style={{ height: 140 }}><PerfChart /></div>
      </div>

      {/* Holdings */}
      <div style={{ padding: '20px 24px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Holdings</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <TH>Symbol</TH><TH right>Shares</TH><TH right>Value</TH>
              <TH right>Today's Return</TH><TH right>Return</TH>
              <TH right>Price/Share</TH><TH right>Sell</TH>
            </tr>
          </thead>
          <tbody>
            <AsyncView {...holdings}>
              {(rows) => <>{rows.map(h => <HoldingRow key={h.symbol} h={h} onSell={handleSell} />)}</>}
            </AsyncView>
          </tbody>
        </table>
      </div>
    </div>
  )
}
