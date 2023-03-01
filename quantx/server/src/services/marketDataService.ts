// ── Mock Market Data Service ─────────────────────────────────────────────────
// In production, swap this with a Zerodha Kite / Alpha Vantage / NSE adapter.
// Every public method mirrors what a real BrokerService interface would expose.

import type {
  Instrument, Holding, Position, Order,
  PortfolioSummary, OHLCV, AIPrediction,
  OptionContract, NewsItem,
} from '../types/index.js'

// ── Seed data ────────────────────────────────────────────────────────────────
const BASE_INSTRUMENTS: Instrument[] = [
  { symbol:'NIFTY 50',   name:'Nifty 50 Index',           exchange:'NSE', ltp:22410.30, open:22280, high:22510, low:22240, close:22280, change:130.3,  changePct:0.58, volume:0 },
  { symbol:'BANKNIFTY',  name:'Bank Nifty Index',          exchange:'NSE', ltp:48210.55, open:48380, high:48490, low:48010, close:48380, change:-169.4, changePct:-0.35, volume:0 },
  { symbol:'RELIANCE',   name:'Reliance Industries Ltd',   exchange:'NSE', ltp:2943.60, open:2905, high:2958, low:2901, close:2905, change:38.6,  changePct:1.33, volume:4821000 },
  { symbol:'TCS',        name:'Tata Consultancy Services', exchange:'NSE', ltp:3812.45, open:3830, high:3841, low:3795, close:3830, change:-17.6, changePct:-0.46, volume:1204000 },
  { symbol:'INFY',       name:'Infosys Ltd',               exchange:'NSE', ltp:1487.80, open:1474, high:1494, low:1471, close:1474, change:13.8,  changePct:0.94, volume:3311000 },
  { symbol:'HDFCBANK',   name:'HDFC Bank Ltd',             exchange:'NSE', ltp:1642.10, open:1637, high:1651, low:1630, close:1637, change:5.1,   changePct:0.31, volume:5922000 },
  { symbol:'ICICIBANK',  name:'ICICI Bank Ltd',            exchange:'NSE', ltp:1024.35, open:1031, high:1038, low:1019, close:1031, change:-6.7,  changePct:-0.65, volume:7213000 },
  { symbol:'WIPRO',      name:'Wipro Ltd',                 exchange:'NSE', ltp:478.20,  open:473,  high:481,  low:471,  close:473,  change:5.2,   changePct:1.10, volume:2841000 },
  { symbol:'BAJFINANCE', name:'Bajaj Finance Ltd',         exchange:'NSE', ltp:6724.90, open:6750, high:6780, low:6691, close:6750, change:-25.1, changePct:-0.37, volume:941000  },
  { symbol:'TATAMOTORS', name:'Tata Motors Ltd',           exchange:'NSE', ltp:812.60,  open:796,  high:819,  low:793,  close:796,  change:16.6,  changePct:2.08, volume:8124000 },
]

// Live copy with micro-tick simulation
let instruments = BASE_INSTRUMENTS.map(i => ({ ...i }))

export function startTickSimulation(intervalMs = 1500): NodeJS.Timeout {
  return setInterval(() => {
    instruments = instruments.map(inst => {
      const drift   = (Math.random() - 0.499) * 0.0008
      const newLtp  = +(inst.ltp * (1 + drift)).toFixed(2)
      const change  = +(newLtp - inst.close).toFixed(2)
      const changePct = +((change / inst.close) * 100).toFixed(2)
      return { ...inst, ltp: newLtp, change, changePct }
    })
  }, intervalMs)
}

// ── Public API surface ────────────────────────────────────────────────────────
export function getInstruments(): Instrument[] {
  return instruments
}

export function getInstrument(symbol: string): Instrument | undefined {
  return instruments.find(i => i.symbol === symbol.toUpperCase())
}

export function getPortfolioSummary(): PortfolioSummary {
  return {
    totalValue:   536820,
    invested:     480000,
    totalPnl:     56820,
    totalPnlPct:  11.84,
    todayPnl:     8240,
    todayPnlPct:  1.56,
    buyingPower:  264600,
    dayHigh:      540200,
    dayLow:       528400,
  }
}

export function getHoldings(): Holding[] {
  return [
    { symbol:'RELIANCE',   name:'Reliance Industries Ltd',   qty:15, avgPrice:2810, ltp:instruments.find(i=>i.symbol==='RELIANCE')?.ltp    ?? 2943, currentValue:0, todayPnl:0, todayPnlPct:0, totalPnl:0, totalPnlPct:0 },
    { symbol:'TCS',        name:'Tata Consultancy Services', qty:8,  avgPrice:3650, ltp:instruments.find(i=>i.symbol==='TCS')?.ltp         ?? 3812, currentValue:0, todayPnl:0, todayPnlPct:0, totalPnl:0, totalPnlPct:0 },
    { symbol:'INFY',       name:'Infosys Ltd',               qty:30, avgPrice:1380, ltp:instruments.find(i=>i.symbol==='INFY')?.ltp        ?? 1487, currentValue:0, todayPnl:0, todayPnlPct:0, totalPnl:0, totalPnlPct:0 },
    { symbol:'HDFCBANK',   name:'HDFC Bank Ltd',             qty:20, avgPrice:1580, ltp:instruments.find(i=>i.symbol==='HDFCBANK')?.ltp    ?? 1642, currentValue:0, todayPnl:0, todayPnlPct:0, totalPnl:0, totalPnlPct:0 },
    { symbol:'BAJFINANCE', name:'Bajaj Finance Ltd',         qty:5,  avgPrice:6200, ltp:instruments.find(i=>i.symbol==='BAJFINANCE')?.ltp  ?? 6724, currentValue:0, todayPnl:0, todayPnlPct:0, totalPnl:0, totalPnlPct:0 },
    { symbol:'TATAMOTORS', name:'Tata Motors Ltd',           qty:40, avgPrice:680,  ltp:instruments.find(i=>i.symbol==='TATAMOTORS')?.ltp  ?? 812,  currentValue:0, todayPnl:0, todayPnlPct:0, totalPnl:0, totalPnlPct:0 },
  ].map(h => {
    const cv       = h.ltp * h.qty
    const totalPnl = (h.ltp - h.avgPrice) * h.qty
    const todayPnl = cv * (instruments.find(i => i.symbol === h.symbol)?.changePct ?? 0) / 100
    return {
      ...h,
      currentValue: +cv.toFixed(2),
      totalPnl:     +totalPnl.toFixed(2),
      totalPnlPct:  +((totalPnl / (h.avgPrice * h.qty)) * 100).toFixed(2),
      todayPnl:     +todayPnl.toFixed(2),
      todayPnlPct:  +(instruments.find(i => i.symbol === h.symbol)?.changePct ?? 0),
    }
  })
}

export function getPositions(): Position[] {
  return [
    { symbol:'NIFTY24JAN22500CE', qty:50,  avgPrice:142.50, ltp:168.30, pnl:1290,   pnlPct:18.1,  product:'MIS' },
    { symbol:'RELIANCE',          qty:-20, avgPrice:2960,   ltp:instruments.find(i=>i.symbol==='RELIANCE')?.ltp ?? 2943, pnl:0, pnlPct:0, product:'MIS' },
    { symbol:'BANKNIFTY24JAN',    qty:25,  avgPrice:512.80, ltp:489.40, pnl:-585,   pnlPct:-4.6,  product:'MIS' },
    { symbol:'TCS',               qty:10,  avgPrice:3780,   ltp:instruments.find(i=>i.symbol==='TCS')?.ltp ?? 3812, pnl:0, pnlPct:0, product:'CNC' },
  ].map(p => {
    const pnl    = (p.ltp - p.avgPrice) * p.qty
    const pnlPct = ((p.ltp - p.avgPrice) / p.avgPrice) * 100
    return { ...p, pnl: +pnl.toFixed(2), pnlPct: +pnlPct.toFixed(2) }
  })
}

const paperOrders: Order[] = [
  { orderId:'ORD001', symbol:'RELIANCE',   side:'BUY',  qty:5,  price:2910,   orderType:'MARKET', status:'EXECUTED', exchange:'NSE', timestamp: new Date(Date.now()-3600000).toISOString() },
  { orderId:'ORD002', symbol:'INFY',       side:'SELL', qty:10, price:1491.5, orderType:'LIMIT',  status:'EXECUTED', exchange:'NSE', timestamp: new Date(Date.now()-7200000).toISOString() },
  { orderId:'ORD003', symbol:'TCS',        side:'BUY',  qty:3,  price:3802,   orderType:'LIMIT',  status:'EXECUTED', exchange:'NSE', timestamp: new Date(Date.now()-9000000).toISOString() },
  { orderId:'ORD004', symbol:'BAJFINANCE', side:'BUY',  qty:2,  price:6698.75,orderType:'MARKET', status:'EXECUTED', exchange:'NSE', timestamp: new Date(Date.now()-10800000).toISOString() },
]

export function getOrders(): Order[] {
  return [...paperOrders].reverse()
}

export function placeOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  qty: number,
  price: number,
  orderType: Order['orderType'],
  exchange: string
): Order {
  const order: Order = {
    orderId:   `ORD${String(paperOrders.length + 1).padStart(3,'0')}`,
    symbol:    symbol.toUpperCase(),
    side, qty, price, orderType, exchange,
    status:    'EXECUTED',
    timestamp: new Date().toISOString(),
  }
  paperOrders.push(order)
  return order
}

export function getOHLCV(symbol: string, interval: string, bars = 80): OHLCV[] {
  const base  = instruments.find(i => i.symbol === symbol)?.close ?? 2900
  const candles: OHLCV[] = []
  let prev = base * 0.95
  const now = Date.now()
  const stepMs = interval === '1m' ? 60000 : interval === '5m' ? 300000 : 86400000

  for (let i = bars; i >= 0; i--) {
    const open  = prev
    const close = +(open * (1 + (Math.random() - 0.49) * 0.008)).toFixed(2)
    const high  = +(Math.max(open, close) * (1 + Math.random() * 0.004)).toFixed(2)
    const low   = +(Math.min(open, close) * (1 - Math.random() * 0.004)).toFixed(2)
    const vol   = Math.floor(Math.random() * 80000 + 20000)
    candles.push({ timestamp: new Date(now - i * stepMs).toISOString(), open, high, low, close, volume: vol })
    prev = close
  }
  return candles
}

export function getAIPrediction(symbol: string): AIPrediction {
  const inst = instruments.find(i => i.symbol === symbol)
  const base = inst?.ltp ?? 22410
  return {
    symbol,
    confidence: 72,
    next1d:    +(base * 1.0077).toFixed(2),
    next5d:    +(base * 1.021).toFixed(2),
    signal:    'BUY',
    mse:       0.000341,
    accuracy:  74.2,
    updatedAt: new Date().toISOString(),
  }
}

export function getOptionChain(symbol: string): OptionContract[] {
  const base  = instruments.find(i => i.symbol === symbol)?.ltp ?? 22400
  const atm   = Math.round(base / 100) * 100
  const strikes = [-400,-300,-200,-100, 0, 100, 200, 300, 400].map(d => atm + d)
  return strikes.map(strike => ({
    strike,
    expiry:  '30-Jan-2025',
    ceLtp:   +Math.max(1, base - strike + (Math.random()*20-10)).toFixed(2),
    peLtp:   +Math.max(1, strike - base + (Math.random()*20-10)).toFixed(2),
    ceOi:    Math.floor(Math.random() * 900000 + 100000),
    peOi:    Math.floor(Math.random() * 900000 + 100000),
    ceIv:    +(15 + Math.random() * 5).toFixed(1),
    peIv:    +(17 + Math.random() * 5).toFixed(1),
    pcr:     +(Math.random() * 2 + 0.5).toFixed(2),
    atm:     strike === atm,
  }))
}

export function getNews(): NewsItem[] {
  return [
    { id:'n1', source:'ET Markets',   title:'Reliance Industries Q3 results beat estimates; PAT up 18% YoY', url:'#', sentiment:'bullish', symbols:['RELIANCE'], publishedAt: new Date(Date.now()-120000).toISOString() },
    { id:'n2', source:'Moneycontrol', title:'RBI holds repo rate steady at 6.5% — neutral stance maintained', url:'#', sentiment:'neutral', symbols:['NIFTY 50'], publishedAt: new Date(Date.now()-480000).toISOString() },
    { id:'n3', source:'Bloomberg',    title:'FII outflow of ₹2,840 Cr in cash segment on Friday session', url:'#', sentiment:'bearish', symbols:['NIFTY 50'], publishedAt: new Date(Date.now()-900000).toISOString() },
    { id:'n4', source:'NSE',          title:'TCS misses revenue guidance; margin expands to 24.6%', url:'#', sentiment:'neutral', symbols:['TCS'], publishedAt: new Date(Date.now()-1320000).toISOString() },
    { id:'n5', source:'Reuters',      title:'Bajaj Finance GNPA rises; analyst cuts target to ₹7,100', url:'#', sentiment:'bearish', symbols:['BAJFINANCE'], publishedAt: new Date(Date.now()-1860000).toISOString() },
    { id:'n6', source:'ET Markets',   title:'Tata Motors EV sales cross 10,000 units; JLR profit surges', url:'#', sentiment:'bullish', symbols:['TATAMOTORS'], publishedAt: new Date(Date.now()-2700000).toISOString() },
  ]
}
