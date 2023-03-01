// ── AI Prediction Page ────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js'
import { useStore, useAIPrediction, useOptionChain, useOHLCVSeries, useTimeLabels } from '../../hooks'
import { AsyncView } from '../ui'
import { CHART_OPTIONS, GRID_STYLE, TICK_STYLE } from '../../utils/chart'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend)

const SECTOR_SIGNALS = [
  { sector: 'IT',      signal: 'BUY',        strength: 68 },
  { sector: 'BANKING', signal: 'HOLD',       strength: 52 },
  { sector: 'AUTO',    signal: 'BUY',        strength: 78 },
  { sector: 'PHARMA',  signal: 'SELL',       strength: 38 },
  { sector: 'ENERGY',  signal: 'STRONG BUY', strength: 82 },
  { sector: 'METALS',  signal: 'HOLD',       strength: 49 },
]

function AiChart() {
  const ref    = useRef<HTMLCanvasElement>(null)
  const actual = useOHLCVSeries(50, 22200, 80, 4)
  const labels = [...useTimeLabels(50, 'date'), 'T+1','T+2','T+3','T+4','T+5']

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const predicted = actual.map(v => v + (Math.random() - .45) * 40)
    const chart = new ChartJS(ctx, {
      type: 'line',
      data: { labels, datasets: [
        { data: [...actual, ...Array(5).fill(null)], label: 'Actual', borderColor: '#00c853', borderWidth: 2, pointRadius: 0, tension: .3, fill: false },
        { data: [...predicted, ...Array(5).fill(null)], label: 'Predicted', borderColor: '#b388ff', borderWidth: 1.5, borderDash: [3,2], pointRadius: 0, tension: .3, fill: false },
        { data: [...Array(50).fill(null), actual[49], ...Array(4).fill(null).map((_,i) => actual[49]+(i+1)*55)], label: 'Forecast', borderColor: '#ffd740', borderWidth: 2, borderDash: [5,3], pointRadius: 3, pointBackgroundColor: '#ffd740', tension: .3, fill: false },
      ]},
      options: { ...CHART_OPTIONS, plugins: { legend: { display: true, labels: { color: '#8a95a3', font: { family: 'JetBrains Mono', size: 9 }, boxWidth: 18 } } }, scales: {
        x: { grid: { color: GRID_STYLE.color }, ticks: { ...TICK_STYLE, maxTicksLimit: 8 } as never },
        y: { grid: { color: GRID_STYLE.color }, ticks: { ...TICK_STYLE, callback: (v) => (+v).toFixed(0) } as never },
      }},
    })
    return () => chart.destroy()
  }, [])
  return <canvas ref={ref} />
}

function ConfidenceRing({ pct }: { pct: number }) {
  const r = 46, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{pct}%</div>
        <div style={{ fontSize: 9, color: 'var(--sub)' }}>conf.</div>
      </div>
    </div>
  )
}

const CARD: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }
const CLBL: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)', marginBottom: 14 }

export default function AIPage() {
  const fetchAI     = useStore(s => s.fetchAI)
  const prediction  = useAIPrediction()
  const optionChain = useOptionChain()

  useEffect(() => { fetchAI('NIFTY 50') }, [fetchAI])

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Signal card */}
        <div style={CARD}>
          <div style={CLBL}>QuantX RNN — AI Signal</div>
          <AsyncView {...prediction}>
            {(pred) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ConfidenceRing pct={pred.confidence} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { k: 'SYMBOL', v: pred.symbol, accent: true },
                    { k: 'NEXT 1D', v: pred.next1d.toLocaleString('en-IN') + ' ▲', accent: true },
                    { k: 'NEXT 5D', v: pred.next5d.toLocaleString('en-IN') + ' ▲', accent: true },
                    { k: 'MSE',     v: pred.mse.toString(), accent: false },
                    { k: 'SIGNAL',  v: pred.signal, badge: true, accent: true },
                  ].map(row => (
                    <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--sub)' }}>{row.k}</div>
                      {row.badge
                        ? <span style={{ background: 'rgba(0,200,83,.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{row.v}</span>
                        : <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: row.accent ? 'var(--accent)' : 'var(--text)' }}>{row.v}</div>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AsyncView>
        </div>

        {/* Model info */}
        <div style={CARD}>
          <div style={CLBL}>Model Training — RNN Loss</div>
          {/* Epoch bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, marginBottom: 12 }}>
            {[0.0089,0.0061,0.0044,0.0033,0.0026,0.0022,0.0019,0.0017,0,0].map((l,i) => {
              const max = 0.0089
              return <div key={i} style={{ flex: 1, background: 'var(--accent)', borderRadius: '2px 2px 0 0', height: l>0?`${(l/max)*100}%`:'8%', opacity: l>0?.7:.15 }} />
            })}
          </div>
          {[['Architecture','LSTM × 3 layers'],['Input Features','24 (OHLCV + indicators)'],['Lookback','60 candles'],['Train Accuracy','74.2%']].map(([k,v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--sub)' }}>{k}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast chart */}
      <div style={{ ...CARD, marginBottom: 16 }}>
        <div style={CLBL}>NIFTY 50 — Actual vs Predicted vs Forecast</div>
        <div style={{ height: 180 }}><AiChart /></div>
      </div>

      {/* Sector signals */}
      <div style={{ ...CARD, marginBottom: 16 }}>
        <div style={CLBL}>Sector AI Signals</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {SECTOR_SIGNALS.map(s => {
            const color = s.strength >= 70 ? 'var(--accent)' : s.strength >= 50 ? 'var(--yellow)' : 'var(--red)'
            return (
              <div key={s.sector} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--sub)', marginBottom: 8 }}>{s.sector}</div>
                <div style={{ height: 4, background: 'var(--muted)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.strength}%`, background: color, borderRadius: 2, transition: 'width .4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color }}>{s.signal}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--sub)' }}>{s.strength}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Option chain */}
      <div style={CARD}>
        <div style={CLBL}>NIFTY 50 — Option Chain</div>
        <AsyncView {...optionChain}>
          {(chain) => (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr .7fr .8fr 1fr .8fr .7fr 1fr .6fr', marginBottom: 6 }}>
                {['OI','IV%','CE LTP','STRIKE','PE LTP','IV%','OI','PCR'].map((h,i) => (
                  <div key={i} style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--sub)', padding: '0 0 8px', borderBottom: '1px solid var(--border)', textAlign: i < 3 ? 'right' : i === 3 ? 'center' : 'left' }}>{h}</div>
                ))}
              </div>
              {chain.map(o => (
                <div key={o.strike} style={{ display: 'grid', gridTemplateColumns: '1fr .7fr .8fr 1fr .8fr .7fr 1fr .6fr', padding: '7px 0', borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, background: o.atm ? 'rgba(255,215,64,.03)' : 'transparent' }}>
                  <div style={{ color: 'var(--accent)', textAlign: 'right' }}>{(o.ceOi/1000).toFixed(0)}K</div>
                  <div style={{ color: 'var(--accent)', textAlign: 'right' }}>{o.ceIv}%</div>
                  <div style={{ color: 'var(--accent)', textAlign: 'right' }}>₹{o.ceLtp}</div>
                  <div style={{ textAlign: 'center', color: o.atm ? 'var(--yellow)' : 'var(--sub)', fontWeight: o.atm ? 700 : 400 }}>{o.strike.toLocaleString('en-IN')}</div>
                  <div style={{ color: 'var(--red)' }}>₹{o.peLtp}</div>
                  <div style={{ color: 'var(--red)' }}>{o.peIv}%</div>
                  <div style={{ color: 'var(--red)' }}>{(o.peOi/1000).toFixed(0)}K</div>
                  <div style={{ textAlign: 'right', color: o.pcr > 1 ? 'var(--accent)' : 'var(--red)' }}>{o.pcr}</div>
                </div>
              ))}
            </>
          )}
        </AsyncView>
      </div>
    </div>
  )
}
