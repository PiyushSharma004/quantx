// ── Market News Page ──────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react'
import { useNews, useStore } from '../hooks/index'
import { AsyncView } from '../components/ui/index'
import type { NewsItem } from '../types/index'

// ── Static seed news (used when backend isn't running) ───────────────────────
const SEED_NEWS: NewsItem[] = [
  { id:'1',  source:'MINT',     title:'FIIs buy ₹4,200 Cr in Indian equities; IT sector leads gains on strong Q2 earnings outlook', url:'#', sentiment:'bullish', symbols:['NIFTY50','INFY','TCS'],     publishedAt: new Date(Date.now()-2*60000).toISOString() },
  { id:'2',  source:'ET',       title:'RBI likely to hold rates in December policy — economists polled expect status quo on repo rate', url:'#', sentiment:'neutral', symbols:['BANKNIFTY'],              publishedAt: new Date(Date.now()-8*60000).toISOString() },
  { id:'3',  source:'CNBC-TV18',title:'BankNifty faces stiff resistance at 48,500; PCR ratio signals caution for bulls above current levels', url:'#', sentiment:'bearish', symbols:['BANKNIFTY'],       publishedAt: new Date(Date.now()-14*60000).toISOString() },
  { id:'4',  source:'BSE',      title:'Reliance Q2 results: Net profit up 8.9% YoY at ₹17,394 Cr, beats Street estimates on Jio growth', url:'#', sentiment:'bullish', symbols:['RELIANCE'],            publishedAt: new Date(Date.now()-22*60000).toISOString() },
  { id:'5',  source:'NSE',      title:'SEBI tightens F&O entry norms — weekly expiry contracts to be restricted from January 2025', url:'#', sentiment:'bearish', symbols:['NIFTY50','BANKNIFTY'],      publishedAt: new Date(Date.now()-35*60000).toISOString() },
  { id:'6',  source:'MCX',      title:'Gold futures cross ₹73,000 mark; safe-haven demand accelerates on Middle East tensions', url:'#', sentiment:'bullish', symbols:['GOLD'],                           publishedAt: new Date(Date.now()-48*60000).toISOString() },
  { id:'7',  source:'HDFC SEC', title:'Infosys raises FY25 revenue guidance to 4.5-5%; large deal wins drive optimism for IT sector', url:'#', sentiment:'bullish', symbols:['INFY','TCS','WIPRO'],      publishedAt: new Date(Date.now()-62*60000).toISOString() },
  { id:'8',  source:'IIFL',     title:'Crude oil prices dip 2.1% on rising US inventories; MCX Crude futures fall below ₹6,800', url:'#', sentiment:'bearish', symbols:['CRUDEOIL'],                   publishedAt: new Date(Date.now()-75*60000).toISOString() },
  { id:'9',  source:'ET MKTS',  title:'Midcap index outperforms Nifty 50 for third consecutive week amid domestic institutional buying', url:'#', sentiment:'bullish', symbols:['NIFTY50'],              publishedAt: new Date(Date.now()-90*60000).toISOString() },
  { id:'10', source:'ZERODHA',  title:'Options expiry week: High implied volatility expected in BankNifty; traders advised caution', url:'#', sentiment:'neutral', symbols:['BANKNIFTY'],               publishedAt: new Date(Date.now()-110*60000).toISOString() },
  { id:'11', source:'LIVEMINT', title:'HDFC Bank quarterly net interest margin contracts slightly; loan growth remains resilient at 17%', url:'#', sentiment:'neutral', symbols:['HDFCBANK'],           publishedAt: new Date(Date.now()-130*60000).toISOString() },
  { id:'12', source:'BQ PRIME', title:'Auto sector hits record: Maruti Suzuki, Tata Motors report strong festive season volume data', url:'#', sentiment:'bullish', symbols:['MARUTI','TATAMOTORS'],    publishedAt: new Date(Date.now()-155*60000).toISOString() },
  { id:'13', source:'REUTERS',  title:'India GDP growth forecast revised upward to 7.2% for FY25 by IMF; consumption drives momentum', url:'#', sentiment:'bullish', symbols:['NIFTY50'],              publishedAt: new Date(Date.now()-180*60000).toISOString() },
  { id:'14', source:'FE',       title:'Power sector stocks decline after CERC proposes new tariff regulations curbing return on equity', url:'#', sentiment:'bearish', symbols:['NTPC','POWERGRID'],    publishedAt: new Date(Date.now()-200*60000).toISOString() },
  { id:'15', source:'NDTV BSND',title:'Silver prices surge 4% this week driven by industrial demand uptick and weak dollar index', url:'#', sentiment:'bullish', symbols:['SILVER'],                   publishedAt: new Date(Date.now()-230*60000).toISOString() },
  { id:'16', source:'MONEYC.',  title:'Rupee strengthens to 83.42 vs USD on FII inflows; RBI seen capping appreciation above 83.20', url:'#', sentiment:'neutral', symbols:['USDINR'],                publishedAt: new Date(Date.now()-260*60000).toISOString() },
]

const CATEGORIES = ['All', 'Equity', 'F&O', 'Commodity', 'Currency', 'Economy', 'Global']
const SENTIMENTS = ['All', 'Bullish', 'Neutral', 'Bearish']
const TOP_SYMBOLS = ['NIFTY50','BANKNIFTY','RELIANCE','TCS','INFY','HDFCBANK','GOLD','CRUDEOIL']

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`
  return `${Math.floor(mins/1440)}d ago`
}

function sentimentMeta(s: string) {
  if (s === 'bullish') return { color:'var(--accent)', label:'▲ BULLISH', bg:'rgba(0,200,83,.1)',  border:'rgba(0,200,83,.2)' }
  if (s === 'bearish') return { color:'var(--red)',    label:'▼ BEARISH', bg:'rgba(255,82,82,.1)', border:'rgba(255,82,82,.2)' }
  return                       { color:'var(--yellow)',label:'● NEUTRAL', bg:'rgba(255,215,64,.1)',border:'rgba(255,215,64,.2)' }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SentimentBar({ items }: { items: NewsItem[] }) {
  const bull = items.filter(i => i.sentiment === 'bullish').length
  const bear = items.filter(i => i.sentiment === 'bearish').length
  const neut = items.filter(i => i.sentiment === 'neutral').length
  const total = items.length || 1

  return (
    <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px' }}>
      <div style={{ fontSize:10, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', letterSpacing:.8, marginBottom:12 }}>
        Market Sentiment — {items.length} articles
      </div>
      <div style={{ display:'flex', gap:16, marginBottom:12 }}>
        {[
          { label:'Bullish', count:bull, color:'var(--accent)', bg:'rgba(0,200,83,.1)' },
          { label:'Neutral', count:neut, color:'var(--yellow)', bg:'rgba(255,215,64,.1)' },
          { label:'Bearish', count:bear, color:'var(--red)',    bg:'rgba(255,82,82,.1)' },
        ].map(s => (
          <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
            <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, fontWeight:700, color:s.color }}>{s.count}</div>
            <div style={{ fontSize:10, color:'var(--sub)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Stacked bar */}
      <div style={{ height:6, borderRadius:3, overflow:'hidden', display:'flex', gap:1 }}>
        <div style={{ flex: bull/total, background:'var(--accent)', transition:'flex .4s' }} />
        <div style={{ flex: neut/total, background:'var(--yellow)', transition:'flex .4s' }} />
        <div style={{ flex: bear/total, background:'var(--red)',    transition:'flex .4s' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:9, color:'var(--accent)' }}>{((bull/total)*100).toFixed(0)}%</span>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:9, color:'var(--yellow)' }}>{((neut/total)*100).toFixed(0)}%</span>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:9, color:'var(--red)'    }}>{((bear/total)*100).toFixed(0)}%</span>
      </div>
    </div>
  )
}

function FeaturedCard({ item }: { item: NewsItem }) {
  const sm = sentimentMeta(item.sentiment)
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{ background: hov ? 'var(--card)' : 'var(--panel)', border:`1px solid ${hov ? sm.border : 'var(--border)'}`, borderRadius:12, padding:'18px 20px', cursor:'pointer', transition:'all .16s', borderLeft:`3px solid ${sm.color}` }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:9, fontWeight:700, background:'var(--card)', border:'1px solid var(--border)', borderRadius:3, padding:'2px 7px', color:'var(--sub)', letterSpacing:.5 }}>{item.source}</span>
          {item.symbols.slice(0,3).map(sym=>(
            <span key={sym} style={{ fontSize:8, fontWeight:700, background:sm.bg, color:sm.color, borderRadius:3, padding:'1px 5px' }}>{sym}</span>
          ))}
        </div>
        <span style={{ fontSize:9, color:'var(--muted)', fontFamily:'JetBrains Mono,monospace', flexShrink:0 }}>{timeAgo(item.publishedAt)}</span>
      </div>
      <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', lineHeight:1.5, marginBottom:10 }}>{item.title}</div>
      <span style={{ display:'inline-block', fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:4, background:sm.bg, color:sm.color, border:`1px solid ${sm.border}` }}>{sm.label}</span>
    </div>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const sm = sentimentMeta(item.sentiment)
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
    >
      {/* Sentiment strip */}
      <div style={{ width:3, borderRadius:2, background:sm.color, flexShrink:0, alignSelf:'stretch', opacity:.7 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
          <span style={{ fontSize:8, fontWeight:700, background:'var(--card)', border:'1px solid var(--border)', borderRadius:3, padding:'1px 5px', color:'var(--sub)', letterSpacing:.4 }}>{item.source}</span>
          {item.symbols.slice(0,2).map(sym=>(
            <span key={sym} style={{ fontSize:8, fontWeight:700, background:sm.bg, color:sm.color, borderRadius:3, padding:'1px 4px' }}>{sym}</span>
          ))}
          <span style={{ fontSize:9, color:'var(--muted)', fontFamily:'JetBrains Mono,monospace', marginLeft:'auto', flexShrink:0 }}>{timeAgo(item.publishedAt)}</span>
        </div>
        <div style={{ fontSize:13, color: hov ? 'var(--text)' : 'rgba(224,232,240,.85)', lineHeight:1.45, transition:'color .15s' }}>{item.title}</div>
        <span style={{ display:'inline-block', fontSize:8, fontWeight:700, marginTop:5, padding:'2px 6px', borderRadius:3, background:sm.bg, color:sm.color }}>{sm.label}</span>
      </div>
    </div>
  )
}

function SymbolPill({ sym, active, onClick }: { sym:string; active:boolean; onClick:()=>void }) {
  return (
    <div onClick={onClick} style={{ padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:700, fontFamily:'JetBrains Mono,monospace', letterSpacing:.3, color:active?'var(--accent)':'var(--sub)', background:active?'rgba(0,200,83,.1)':'var(--card)', border:`1px solid ${active?'rgba(0,200,83,.25)':'var(--border)'}`, transition:'all .14s', whiteSpace:'nowrap' }}>
      {sym}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MarketNewsPage() {
  const news       = useNews()
  const fetchNews  = useStore(s => s.fetchNews)
  const [category, setCategory]     = useState('All')
  const [sentiment, setSentiment]   = useState('All')
  const [symFilter, setSymFilter]   = useState<string|null>(null)
  const [search, setSearch]         = useState('')
  const [lastRefresh, setRefresh]   = useState(Date.now())

  // Use seed data when backend isn't available
  const allItems: NewsItem[] = useMemo(() => {
    if (news.data && news.data.length > 0) return news.data
    return SEED_NEWS
  }, [news.data])

  useEffect(() => { fetchNews() }, [fetchNews])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(() => { fetchNews(); setRefresh(Date.now()) }, 60000)
    return () => clearInterval(id)
  }, [fetchNews])

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      if (sentiment !== 'All' && item.sentiment !== sentiment.toLowerCase()) return false
      if (symFilter && !item.symbols.includes(symFilter)) return false
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.source.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [allItems, sentiment, symFilter, search])

  const featured = filtered.slice(0, 3)
  const rest     = filtered.slice(3)

  const handleRefresh = () => { fetchNews(); setRefresh(Date.now()) }

  return (
    <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding:'18px 24px 14px', background:'var(--panel)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div>
            <h2 style={{ fontSize:11, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', letterSpacing:.8, marginBottom:4 }}>Market News</h2>
            <div style={{ fontSize:20, fontWeight:700, letterSpacing:-.4 }}>
              {filtered.length} <span style={{ fontSize:13, fontWeight:400, color:'var(--sub)' }}>articles · India Markets</span>
            </div>
            <div style={{ fontSize:11, color:'var(--sub)', marginTop:4 }}>NSE · BSE · MCX · Economy · Global · Auto-refreshes every 60s</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,200,83,.06)', border:'1px solid rgba(0,200,83,.15)', borderRadius:20, padding:'4px 10px', fontSize:10, fontWeight:600, color:'var(--accent)', fontFamily:'JetBrains Mono,monospace' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--accent)', animation:'pulse 2s infinite' }} />
              LIVE FEED
            </div>
            <button onClick={handleRefresh} style={{ padding:'6px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--card)', color:'var(--sub)', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .14s' }}
              onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--text)'}
              onMouseLeave={e=>(e.target as HTMLElement).style.color='var(--sub)'}
            >↺ Refresh</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--card)', border:'1px solid var(--border)', borderRadius:9, padding:'8px 14px', maxWidth:400 }}>
          <span style={{ fontSize:13, color:'var(--sub)' }}>⌕</span>
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search news, source…"
            style={{ background:'none', border:'none', color:'var(--text)', fontFamily:'Inter,sans-serif', fontSize:13, flex:1, outline:'none' }}
          />
          {search && <span onClick={()=>setSearch('')} style={{ fontSize:12, color:'var(--muted)', cursor:'pointer' }}>✕</span>}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div style={{ padding:'10px 24px', background:'var(--panel)', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', flexDirection:'column', gap:8 }}>

        {/* Sentiment filter */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:9, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.8, marginRight:4 }}>Sentiment</span>
          {SENTIMENTS.map(s=>{
            const sm = s==='All' ? { color:'var(--sub)' } : sentimentMeta(s.toLowerCase())
            const active = sentiment===s
            return (
              <div key={s} onClick={()=>setSentiment(s)} style={{ padding:'3px 10px', borderRadius:5, fontSize:11, fontWeight:600, cursor:'pointer', color:active?(sm as { color:string }).color:'var(--sub)', background:active?`${(sm as { bg?:string }).bg??'var(--card)'}` :'var(--card)', border:`1px solid ${active?(sm as { border?:string }).border??'var(--border)':'var(--border)'}`, transition:'all .14s' }}>
                {s}
              </div>
            )
          })}
        </div>

        {/* Symbol filter */}
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:9, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.8, marginRight:4 }}>Symbol</span>
          <SymbolPill sym="All" active={!symFilter} onClick={()=>setSymFilter(null)} />
          {TOP_SYMBOLS.map(sym=>(
            <SymbolPill key={sym} sym={sym} active={symFilter===sym} onClick={()=>setSymFilter(symFilter===sym?null:sym)} />
          ))}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 300px', gap:0, overflow:'hidden', minHeight:0 }}>

        {/* Left: news feed */}
        <div style={{ overflowY:'auto', padding:'20px 24px', borderRight:'1px solid var(--border)' }}>

          {filtered.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', color:'var(--sub)', gap:12 }}>
              <div style={{ fontSize:36 }}>📭</div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text)' }}>No articles match your filters</div>
              <div style={{ fontSize:12 }}>Try changing the sentiment or symbol filter</div>
              <button onClick={()=>{ setSentiment('All'); setSymFilter(null); setSearch('') }} style={{ marginTop:8, padding:'8px 18px', borderRadius:8, border:'1px solid var(--accent)', background:'rgba(0,200,83,.08)', color:'var(--accent)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Clear filters</button>
            </div>
          ) : (
            <>
              {/* Featured top 3 */}
              {featured.length > 0 && (
                <>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', letterSpacing:.8, marginBottom:12 }}>Featured</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12, marginBottom:24 }}>
                    {featured.map(item=><FeaturedCard key={item.id} item={item} />)}
                  </div>
                </>
              )}

              {/* Rest of articles */}
              {rest.length > 0 && (
                <>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', letterSpacing:.8, marginBottom:4 }}>Latest</div>
                  {rest.map(item=><NewsCard key={item.id} item={item} />)}
                </>
              )}
            </>
          )}
        </div>

        {/* Right: sentiment + symbol breakdown */}
        <div style={{ overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>

          {/* Sentiment summary */}
          <SentimentBar items={filtered} />

          {/* Top sources */}
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', letterSpacing:.8, marginBottom:12 }}>Top Sources</div>
            {Array.from(new Map(allItems.map(i=>[i.source, allItems.filter(n=>n.source===i.source).length])).entries())
              .sort((a,b)=>b[1]-a[1]).slice(0,8)
              .map(([src, cnt])=>(
                <div key={src} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:10, fontFamily:'JetBrains Mono,monospace', color:'var(--sub)', width:80, flexShrink:0 }}>{src}</span>
                  <div style={{ flex:1, height:4, background:'var(--card)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(cnt/allItems.length)*100}%`, background:'linear-gradient(90deg,var(--blue),var(--accent))', borderRadius:2, transition:'width .4s' }} />
                  </div>
                  <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--text)', width:14, textAlign:'right' }}>{cnt}</span>
                </div>
              ))}
          </div>

          {/* Trending symbols */}
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--sub)', textTransform:'uppercase', letterSpacing:.8, marginBottom:12 }}>Trending Symbols</div>
            {Array.from(new Map(
              allItems.flatMap(i=>i.symbols).reduce((m,s)=>{ m.set(s,(m.get(s)??0)+1); return m }, new Map<string,number>()).entries()
            )).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([sym,cnt])=>(
              <div key={sym} onClick={()=>setSymFilter(symFilter===sym?null:sym)} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, cursor:'pointer', padding:'5px 7px', borderRadius:7, background:symFilter===sym?'rgba(0,200,83,.07)':'transparent', transition:'background .14s' }}>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:700, color:symFilter===sym?'var(--accent)':'var(--text)', width:80 }}>{sym}</span>
                <div style={{ flex:1, height:4, background:'var(--card)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(cnt/allItems.length)*100*2.5}%`, maxWidth:'100%', background: symFilter===sym?'var(--accent)':'var(--purple)', borderRadius:2, transition:'width .4s' }} />
                </div>
                <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'var(--sub)', width:14, textAlign:'right' }}>{cnt}</span>
              </div>
            ))}
          </div>

          {/* Last updated */}
          <div style={{ fontSize:10, color:'var(--muted)', textAlign:'center', fontFamily:'JetBrains Mono,monospace' }}>
            Last updated: {new Date(lastRefresh).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})} IST
          </div>
        </div>
      </div>
    </div>
  )
}
