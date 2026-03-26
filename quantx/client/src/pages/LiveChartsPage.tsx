// ── Trading Chart Page ────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  LineElement, BarElement, PointElement,
  LinearScale, CategoryScale, Filler, Tooltip,
} from 'chart.js'
import { useOHLCVSeries, useTimeLabels } from '../hooks/index'
import { CHART_OPTIONS, GRID_STYLE, TICK_STYLE, bollingerBands } from '../utils/chart'

ChartJS.register(LineElement, BarElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

// ── Constants ─────────────────────────────────────────────────────────────────
const TIME_FRAMES  = ['1m','5m','15m','30m','1H','4H','1D','1W']
const CHART_TYPES  = ['Line','Candle','Mountain']
const INDICATOR_LIST = ['BB','VWAP','EMA 20','EMA 50','RSI','MACD','Volume']

const SYMBOLS = [
  { sym:'RELIANCE',  name:'Reliance Inds.',    base:2943,  vol:14,  exch:'NSE' },
  { sym:'TCS',       name:'Tata Consultancy',  base:3820,  vol:18,  exch:'NSE' },
  { sym:'HDFCBANK',  name:'HDFC Bank',          base:1642,  vol:8,   exch:'NSE' },
  { sym:'INFY',      name:'Infosys Ltd.',        base:1524,  vol:10,  exch:'NSE' },
  { sym:'NIFTY 50',  name:'Nifty 50 Index',     base:22410, vol:80,  exch:'NSE' },
  { sym:'BANKNIFTY', name:'Bank Nifty Index',   base:48210, vol:180, exch:'NFO' },
  { sym:'GOLD',      name:'MCX Gold 24K',        base:72840, vol:200, exch:'MCX' },
  { sym:'CRUDEOIL',  name:'MCX Crude Oil',       base:6820,  vol:30,  exch:'MCX' },
]

const IND_STATS = [
  { label:'RSI (14)',  value:'58.4',       tag:'NEUTRAL',  cls:'neut' },
  { label:'MACD',      value:'+12.8',      tag:'BULLISH',  cls:'bull' },
  { label:'EMA 20',    value:'₹2,924.10',  tag:'ABOVE',    cls:'bull' },
  { label:'EMA 50',    value:'₹2,898.40',  tag:'ABOVE',    cls:'bull' },
  { label:'BB Width',  value:'4.2%',       tag:'SQUEEZE',  cls:'neut' },
  { label:'VWAP',      value:'₹2,918.40',  tag:'ABOVE',    cls:'bull' },
  { label:'Volume',    value:'1.24Cr',     tag:'HIGH',     cls:'bull' },
  { label:'ATR (14)',  value:'28.4',       tag:'NORMAL',   cls:'neut' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
type Sym = typeof SYMBOLS[0]

function tagStyle(cls: string) {
  if (cls === 'bull') return { bg:'rgba(0,200,83,.1)',  color:'var(--accent)' }
  if (cls === 'bear') return { bg:'rgba(255,82,82,.1)', color:'var(--red)' }
  return { bg:'rgba(255,215,64,.1)', color:'var(--yellow)' }
}

function genCandles(n: number, base: number, vol: number) {
  const out: { o:number; h:number; l:number; c:number }[] = []
  let prev = base
  for (let i = 0; i < n; i++) {
    const o = prev
    const c = Math.max(o + (Math.random() - 0.48) * vol, 1)
    const h = Math.max(o, c) + Math.random() * vol * 0.4
    const l = Math.min(o, c) - Math.random() * vol * 0.4
    out.push({ o:+o.toFixed(2), h:+h.toFixed(2), l:+Math.max(l,1).toFixed(2), c:+c.toFixed(2) })
    prev = c
  }
  return out
}

function genBook(mid: number) {
  const asks = Array.from({length:8},(_,i)=>({ price:+(mid+(i+1)*0.5+Math.random()*0.3).toFixed(2), qty:Math.floor(Math.random()*900+100), orders:Math.floor(Math.random()*20+1) })).reverse()
  const bids = Array.from({length:8},(_,i)=>({ price:+(mid-(i+1)*0.5-Math.random()*0.3).toFixed(2), qty:Math.floor(Math.random()*900+100), orders:Math.floor(Math.random()*20+1) }))
  return { asks, bids }
}

// ── Candlestick SVG Chart ─────────────────────────────────────────────────────
function CandleChart({ candles, labels }: { candles:{ o:number;h:number;l:number;c:number }[]; labels:string[] }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg || !candles.length) return
    const W = svg.clientWidth || 880
    const H = 240
    const pad = { t:12, b:28, l:58, r:52 }
    const iW = W - pad.l - pad.r
    const iH = H - pad.t - pad.b

    const allP = candles.flatMap(c => [c.h, c.l])
    const mn = Math.min(...allP), mx = Math.max(...allP), rng = mx - mn || 1
    const toY  = (p:number) => pad.t + (1-(p-mn)/rng)*iH
    const cw   = Math.max(2, (iW/candles.length)*0.65)
    const step = iW/candles.length
    const every = Math.ceil(candles.length/8)

    let grid='', yLbl='', wicks='', bodies='', xLbl=''

    for (let i=0; i<=5; i++) {
      const y  = pad.t + (i/5)*iH
      const pv = mx - (i/5)*rng
      grid += `<line x1="${pad.l}" y1="${y}" x2="${W-pad.r}" y2="${y}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`
      yLbl += `<text x="${pad.l-4}" y="${y+4}" text-anchor="end" fill="#546070" font-size="9" font-family="JetBrains Mono,monospace">₹${pv.toFixed(0)}</text>`
    }

    candles.forEach((c,i) => {
      const x   = pad.l + i*step + step/2
      const oY  = toY(c.o), cY = toY(c.c), hY = toY(c.h), lY = toY(c.l)
      const bull= c.c >= c.o
      const col = bull ? '#00c853' : '#ff5252'
      const bTop= Math.min(oY,cY), bH = Math.max(Math.abs(cY-oY),1)
      wicks  += `<line x1="${x}" y1="${hY}" x2="${x}" y2="${lY}" stroke="${col}" stroke-width="1" opacity=".55"/>`
      bodies += `<rect x="${x-cw/2}" y="${bTop}" width="${cw}" height="${bH}" fill="${col}" opacity="${bull?'0.85':'0.9'}" rx="1"/>`
      if (i % every === 0) xLbl += `<text x="${x}" y="${H-5}" text-anchor="middle" fill="#546070" font-size="9" font-family="JetBrains Mono,monospace">${labels[i]??''}</text>`
    })

    const lc  = candles[candles.length-1].c
    const lpY = toY(lc)
    const lCol= lc >= candles[0].c ? '#00c853' : '#ff5252'

    svg.innerHTML = `
      ${grid}${yLbl}${wicks}${bodies}${xLbl}
      <line x1="${pad.l}" y1="${lpY}" x2="${W-pad.r+2}" y2="${lpY}" stroke="${lCol}" stroke-width="1" stroke-dasharray="4 3" opacity=".45"/>
      <rect x="${W-pad.r+2}" y="${lpY-9}" width="48" height="16" fill="${lCol}" rx="3" opacity=".9"/>
      <text x="${W-pad.r+6}" y="${lpY+3}" fill="#000" font-size="9" font-weight="700" font-family="JetBrains Mono,monospace">₹${lc.toFixed(0)}</text>
    `
  }, [candles, labels])

  return <svg ref={ref} style={{ width:'100%', height:240, display:'block' }} />
}

// ── Volume Bar Chart ──────────────────────────────────────────────────────────
function VolChart({ closes, labels }: { closes:number[]; labels:string[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const vols = Array.from({length:closes.length},()=>Math.floor(Math.random()*80000+20000))
    const chart = new ChartJS(ctx, {
      type:'bar',
      data:{ labels, datasets:[{ data:vols, backgroundColor: closes.map((v,i)=>i>0?v>=closes[i-1]?'rgba(0,200,83,.35)':'rgba(255,82,82,.35)':'rgba(0,200,83,.35)'), borderWidth:0 }] },
      options:{ ...CHART_OPTIONS, scales:{ x:{display:false}, y:{ grid:{color:GRID_STYLE.color}, ticks:{...TICK_STYLE,maxTicksLimit:3,callback:(v:unknown)=>`${(+(v as number)/1000).toFixed(0)}K`} as never } } },
    })
    return () => chart.destroy()
  }, [closes])
  return <canvas ref={ref} />
}

// ── Order Book ────────────────────────────────────────────────────────────────
function OrderBook({ mid }: { mid:number }) {
  const [book, setBook] = useState(()=>genBook(mid))
  useEffect(()=>{ const id=setInterval(()=>setBook(genBook(mid)),2000); return()=>clearInterval(id) },[mid])
  const maxQ = Math.max(...book.asks.map(a=>a.qty),...book.bids.map(b=>b.qty))
  const spread = (book.asks[book.asks.length-1].price - book.bids[0].price).toFixed(2)

  return (
    <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', flexShrink:0 }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:10, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', letterSpacing:.8 }}>Order Book (Depth)</span>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--yellow)' }}>Spread ₹{spread}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 1fr', padding:'5px 14px', background:'var(--card)' }}>
        {['Qty','Ord','Bid','Ask','Ord','Qty'].map((h,i)=>(
          <div key={i} style={{ fontSize:8, fontWeight:700, color:'var(--sub)', textAlign:i<3?'left':'right', textTransform:'uppercase', letterSpacing:.4 }}>{h}</div>
        ))}
      </div>
      {Array.from({length:8},(_,i)=>{
        const ask=book.asks[i], bid=book.bids[i]
        return (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 1fr', padding:'4px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', position:'relative' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${(bid.qty/maxQ)*50}%`, background:'rgba(0,200,83,.05)', zIndex:0 }}/>
            <div style={{ position:'absolute', right:0, top:0, bottom:0, width:`${(ask.qty/maxQ)*50}%`, background:'rgba(255,82,82,.05)', zIndex:0 }}/>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--accent)', position:'relative', zIndex:1 }}>{bid.qty}</span>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--sub)',    position:'relative', zIndex:1 }}>{bid.orders}</span>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:600, color:'var(--accent)', position:'relative', zIndex:1 }}>₹{bid.price.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:600, color:'var(--red)',    textAlign:'right', position:'relative', zIndex:1 }}>₹{ask.price.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--sub)',    textAlign:'right', position:'relative', zIndex:1 }}>{ask.orders}</span>
            <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--red)',    textAlign:'right', position:'relative', zIndex:1 }}>{ask.qty}</span>
          </div>
        )
      })}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 1fr', padding:'7px 14px', background:'var(--card)', borderTop:'1px solid var(--border)' }}>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, fontWeight:700, color:'var(--accent)' }}>{book.bids.reduce((s,b)=>s+b.qty,0).toLocaleString()}</span>
        <span/>
        <span style={{ fontSize:9, fontWeight:700, color:'var(--sub)', textTransform:'uppercase' }}>Bids</span>
        <span style={{ fontSize:9, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', textAlign:'right' }}>Asks</span>
        <span/>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, fontWeight:700, color:'var(--red)', textAlign:'right' }}>{book.asks.reduce((s,a)=>s+a.qty,0).toLocaleString()}</span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LiveChartsPage() {
  const [sym,        setSym]        = useState<Sym>(SYMBOLS[0])
  const [activeTime, setActiveTime] = useState('5m')
  const [activeChart,setActiveChart]= useState('Candle')
  const [activeInds, setActiveInds] = useState(['BB','Volume'])
  const [livePrice,  setLivePrice]  = useState(SYMBOLS[0].base)
  const [liveChg,    setLiveChg]    = useState(+1.32)
  const candlesRef = useRef(genCandles(80, SYMBOLS[0].base, SYMBOLS[0].vol))

  const closes = useOHLCVSeries(80, sym.base, sym.vol, 0.5)
  const labels = useTimeLabels(80, 'time')

  useEffect(() => {
    candlesRef.current = genCandles(80, sym.base, sym.vol)
    setLivePrice(+(sym.base + (Math.random()-.48)*sym.vol*2).toFixed(2))
    setLiveChg(+((Math.random()-.45)*3).toFixed(2))
  }, [sym])

  useEffect(() => {
    const id = setInterval(()=>setLivePrice(p=>+(p+(Math.random()-.49)*sym.vol*0.3).toFixed(2)), 1500)
    return () => clearInterval(id)
  }, [sym])

  const toggle = (ind:string) => setActiveInds(p=>p.includes(ind)?p.filter(i=>i!==ind):[...p,ind])
  const isUp   = liveChg >= 0
  const candles = candlesRef.current
  const dayHigh = Math.max(...candles.map(c=>c.h))
  const dayLow  = Math.min(...candles.map(c=>c.l))

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto' }}>

      {/* ── Header: symbol info + live price ─────────────────────────────── */}
      <div style={{ padding:'14px 24px', background:'var(--panel)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
              <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, fontWeight:700 }}>{sym.sym}</span>
              <span style={{ fontSize:12, color:'var(--sub)' }}>{sym.name}</span>
              <span style={{ fontSize:9, fontWeight:700, background:'var(--card)', border:'1px solid var(--border)', borderRadius:3, padding:'2px 6px', color:'var(--sub)', letterSpacing:.5 }}>{sym.exch}</span>
            </div>
            <div style={{ fontSize:10, color:'var(--sub)', marginTop:3 }}>QuantX · Zerodha Kite Feed · Real-time Simulated</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:28, fontWeight:700, color:isUp?'var(--accent)':'var(--red)', transition:'color .3s' }}>
              ₹{livePrice.toLocaleString('en-IN',{minimumFractionDigits:2})}
            </div>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:13, color:isUp?'var(--accent)':'var(--red)', marginTop:2 }}>
              {isUp?'▲':'▼'} {Math.abs(liveChg).toFixed(2)}%
            </div>
          </div>
        </div>
        {/* OHLCV strip */}
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          {[
            { l:'Open',   v:`₹${candles[0].o.toFixed(2)}` },
            { l:'High',   v:`₹${dayHigh.toFixed(2)}`,  c:'var(--accent)' },
            { l:'Low',    v:`₹${dayLow.toFixed(2)}`,   c:'var(--red)' },
            { l:'Close',  v:`₹${candles[candles.length-1].c.toFixed(2)}` },
            { l:'Volume', v:`${(Math.random()*2+0.8).toFixed(2)}Cr` },
            { l:'52W H',  v:`₹${(sym.base*1.28).toFixed(0)}`, c:'var(--accent)' },
            { l:'52W L',  v:`₹${(sym.base*0.74).toFixed(0)}`, c:'var(--red)' },
          ].map(o=>(
            <div key={o.l}>
              <div style={{ fontSize:9, color:'var(--sub)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{o.l}</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:600, marginTop:2, color:o.c??'var(--text)' }}>{o.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Symbol strip ──────────────────────────────────────────────────── */}
      <div style={{ padding:'8px 24px', background:'var(--panel)', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', gap:6, flexWrap:'wrap' }}>
        {SYMBOLS.map(s=>(
          <div key={s.sym} onClick={()=>setSym(s)} style={{ padding:'4px 11px', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'JetBrains Mono,monospace', color:sym.sym===s.sym?'var(--accent)':'var(--sub)', background:sym.sym===s.sym?'rgba(0,200,83,.1)':'var(--card)', border:`1px solid ${sym.sym===s.sym?'rgba(0,200,83,.25)':'var(--border)'}`, transition:'all .14s' }}>{s.sym}</div>
        ))}
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:4, padding:'7px 24px', background:'var(--panel)', borderBottom:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap' }}>
        {TIME_FRAMES.map(tf=>(
          <div key={tf} onClick={()=>setActiveTime(tf)} style={{ padding:'3px 9px', borderRadius:5, fontSize:10.5, fontWeight:500, cursor:'pointer', fontFamily:'JetBrains Mono,monospace', color:activeTime===tf?'var(--accent)':'var(--sub)', background:activeTime===tf?'rgba(0,200,83,.1)':'var(--card)', border:`1px solid ${activeTime===tf?'rgba(0,200,83,.25)':'var(--border)'}`, transition:'all .14s' }}>{tf}</div>
        ))}
        <div style={{ width:1, height:16, background:'var(--border)', margin:'0 3px' }}/>
        {CHART_TYPES.map(ct=>(
          <div key={ct} onClick={()=>setActiveChart(ct)} style={{ padding:'3px 9px', borderRadius:5, fontSize:10.5, fontWeight:500, cursor:'pointer', color:activeChart===ct?'var(--blue)':'var(--sub)', background:activeChart===ct?'rgba(68,138,255,.1)':'var(--card)', border:`1px solid ${activeChart===ct?'rgba(68,138,255,.25)':'var(--border)'}`, transition:'all .14s' }}>{ct}</div>
        ))}
        <div style={{ width:1, height:16, background:'var(--border)', margin:'0 3px' }}/>
        {INDICATOR_LIST.map(ind=>(
          <div key={ind} onClick={()=>toggle(ind)} style={{ padding:'3px 9px', borderRadius:5, fontSize:10.5, fontWeight:500, cursor:'pointer', color:activeInds.includes(ind)?'var(--yellow)':'var(--sub)', background:activeInds.includes(ind)?'rgba(255,215,64,.08)':'var(--card)', border:`1px solid ${activeInds.includes(ind)?'rgba(255,215,64,.2)':'var(--border)'}`, transition:'all .14s' }}>{ind}</div>
        ))}
      </div>

      {/* ── Chart + Right panel ────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 330px', overflow:'hidden', minHeight:0 }}>

        {/* Left: chart */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid var(--border)' }}>
          <div style={{ background:'var(--panel)', padding:'12px 16px 0', flexShrink:0 }}>
            <CandleChart candles={candles} labels={labels} />
          </div>
          <div style={{ background:'var(--panel)', padding:'0 16px 10px', height:60, flexShrink:0, borderBottom:'1px solid var(--border)' }}>
            <VolChart closes={closes} labels={labels} />
          </div>
          {/* Indicator cards */}
          <div style={{ padding:16, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, overflowY:'auto' }}>
            {IND_STATS.map(ind=>{
              const tc = tagStyle(ind.cls)
              return (
                <div key={ind.label} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
                  <div style={{ fontSize:9, color:'var(--sub)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>{ind.label}</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:16, fontWeight:600, marginBottom:5 }}>{ind.value}</div>
                  <span style={{ background:tc.bg, color:tc.color, padding:'2px 6px', borderRadius:4, fontSize:8, fontWeight:700, letterSpacing:.5 }}>{ind.tag}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: order book + quick trade + recent trades */}
        <div style={{ overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10 }}>

          {/* Quick BUY/SELL */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button style={{ padding:'10px 0', borderRadius:8, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#005e22,#00c853)', color:'#fff', fontSize:13, fontWeight:700 }}>▲ BUY</button>
            <button style={{ padding:'10px 0', borderRadius:8, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#7a1e1e,#ff5252)', color:'#fff', fontSize:13, fontWeight:700 }}>▼ SELL</button>
          </div>

          {/* Order book */}
          <OrderBook mid={livePrice} />

          {/* Recent trades */}
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', flexShrink:0 }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', letterSpacing:.8 }}>Recent Trades</span>
            </div>
            <div style={{ padding:'0 0 6px' }}>
              {Array.from({length:8},(_,i)=>{
                const buy = Math.random()>.5
                const tp  = +(livePrice+(Math.random()-.5)*sym.vol).toFixed(2)
                const qty = Math.floor(Math.random()*500+1)
                const d   = new Date(); d.setSeconds(d.getSeconds()-i*7)
                const t   = d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})
                return (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', padding:'5px 14px', borderBottom:'1px solid rgba(255,255,255,0.025)' }}>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:buy?'var(--accent)':'var(--red)', fontWeight:600 }}>₹{tp.toLocaleString('en-IN')}</span>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'var(--text)', textAlign:'center' }}>{qty}</span>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--sub)', textAlign:'right' }}>{t}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
