// ── Paper Trade Page ──────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useStore, usePositions, useOrders } from '../hooks/index'
import { AsyncView } from '../components/ui/index'
import { fmtINR } from '../utils/chart'

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
  fontSize: 13, outline: 'none', width: '100%', transition: 'border-color .14s',
}

export default function PaperTradePage() {
  const fetchOrders  = useStore(s => s.fetchOrders)
  const fetchPortfolio = useStore(s => s.fetchPortfolio)
  const submitOrder  = useStore(s => s.submitOrder)
  const positions    = usePositions()
  const orders       = useOrders()

  const [sym,       setSym]       = useState('RELIANCE')
  const [exchange,  setExchange]  = useState('NSE')
  const [orderType, setOrderType] = useState('MARKET')
  const [qty,       setQty]       = useState('10')
  const [price,     setPrice]     = useState('2943.60')
  const [sl,        setSl]        = useState('2910.00')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchOrders(); fetchPortfolio() }, [fetchOrders, fetchPortfolio])

  const place = async (side: 'BUY' | 'SELL') => {
    setSubmitting(true)
    await submitOrder({ symbol: sym, side, qty: +qty, price: +price, orderType, exchange })
    setSubmitting(false)
  }

  const CARD: React.CSSProperties  = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }
  const LABEL: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Account stats */}
      <div style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '20px 24px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)', marginBottom: 10 }}>Paper Trading Account</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { label: 'Virtual Balance', value: '₹10,00,000', color: 'var(--text)' },
            { label: 'Total P&L',       value: '+₹18,420',   color: 'var(--accent)' },
            { label: 'Today P&L',       value: '+₹4,210',    color: 'var(--accent)' },
            { label: 'Trades',          value: String((orders.data?.length ?? 0)), color: 'var(--text)' },
            { label: 'Win Rate',        value: '66.7%',       color: 'var(--accent)' },
          ].map(s => (
            <div key={s.label} style={{ padding: '12px 16px 12px 0', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .7, color: 'var(--sub)', marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Order form */}
        <div style={CARD}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)', marginBottom: 16 }}>Place Paper Order</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Symbol',     el: <input style={INPUT_STYLE} value={sym} onChange={e => setSym(e.target.value.toUpperCase())} /> },
              { label: 'Exchange',   el: <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={exchange} onChange={e => setExchange(e.target.value)}>{['NSE','BSE','NFO','MCX'].map(o=><option key={o}>{o}</option>)}</select> },
              { label: 'Order Type', el: <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={orderType} onChange={e => setOrderType(e.target.value)}>{['MARKET','LIMIT','SL-M','SL'].map(o=><option key={o}>{o}</option>)}</select> },
            ].map(f => (
              <div key={f.label}><div style={LABEL}>{f.label}</div>{f.el}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            {[
              { label: 'Quantity',      val: qty,   set: setQty,   type: 'number' },
              { label: 'Price (₹)',     val: price, set: setPrice, type: 'number' },
              { label: 'Stop Loss (₹)', val: sl,    set: setSl,    type: 'number' },
            ].map(f => (
              <div key={f.label}><div style={LABEL}>{f.label}</div><input type={f.type} style={INPUT_STYLE} value={f.val} onChange={e => f.set(e.target.value)} /></div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={submitting} onClick={() => place('BUY')}  style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#00a040,var(--accent))', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? .6 : 1 }}>Buy</button>
              <button disabled={submitting} onClick={() => place('SELL')} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#c62828,var(--red))', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? .6 : 1 }}>Sell</button>
            </div>
          </div>
        </div>

        {/* Open Positions */}
        <div style={CARD}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)', marginBottom: 16 }}>Open Positions</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Symbol','Qty','Avg Price','LTP','P&L','Change'].map((h,i) => <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', fontSize: 9, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: .7, padding: '0 0 9px', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              <AsyncView {...positions}>
                {(rows) => <>{rows.map(p => {
                  const up = p.pnl >= 0
                  return (
                    <tr key={p.symbol}>
                      <td style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{p.symbol}</td>
                      <td style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{p.qty}</td>
                      <td style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>₹{fmtINR(p.avgPrice)}</td>
                      <td style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>₹{fmtINR(p.ltp)}</td>
                      <td style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: up ? 'var(--accent)' : 'var(--red)' }}>{up?'+':''}₹{fmtINR(Math.abs(p.pnl),0)}</td>
                      <td style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: up ? 'var(--accent)' : 'var(--red)' }}>{up?'+':''}{p.pnlPct.toFixed(2)}%</td>
                    </tr>
                  )
                })}</>}
              </AsyncView>
            </tbody>
          </table>
        </div>

        {/* Order Log */}
        <div style={CARD}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, color: 'var(--sub)', marginBottom: 16 }}>Order Log</div>
          <AsyncView {...orders}>
            {(rows) => <>{rows.slice(0, 10).map(o => (
              <div key={o.orderId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: o.side === 'BUY' ? 'rgba(0,200,83,.12)' : 'rgba(255,82,82,.12)', color: o.side === 'BUY' ? 'var(--accent)' : 'var(--red)', flexShrink: 0 }}>{o.side}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{o.symbol}</span>
                <span style={{ color: 'var(--sub)', fontSize: 11 }}>× {o.qty}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>@ ₹{fmtINR(o.price)}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(o.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
              </div>
            ))}</>}
          </AsyncView>
        </div>
      </div>
    </div>
  )
}
