// ── Chart Utilities ───────────────────────────────────────────────────────────
import type { ChartOptions, ScaleOptions } from 'chart.js'

export const CHART_OPTIONS: Partial<ChartOptions<'line'>> = {
  responsive:          true,
  maintainAspectRatio: false,
  animation:           { duration: 0 },
  plugins:             { legend: { display: false }, tooltip: { enabled: true } },
}

export const GRID_STYLE  = { color: 'rgba(255,255,255,0.03)' }
export const TICK_STYLE: Partial<ScaleOptions<'linear'>['ticks']> = {
  color: '#3d4554',
  font:  { family: 'JetBrains Mono', size: 9 },
}

export function bollingerBands(closes: number[], period = 20) {
  const upper: number[] = [], lower: number[] = [], mid: number[] = []
  for (let i = 0; i < closes.length; i++) {
    const sl = closes.slice(Math.max(0, i - period + 1), i + 1)
    const m  = sl.reduce((a, b) => a + b, 0) / sl.length
    const sd = Math.sqrt(sl.reduce((a, b) => a + (b - m) ** 2, 0) / sl.length)
    mid.push(m); upper.push(+(m + sd).toFixed(2)); lower.push(+(m - sd).toFixed(2))
  }
  return { upper, lower, mid }
}

export function fmtINR(val: number, dec = 2): string {
  return val.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export function fmtCompact(val: number): string {
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`
  return `₹${val.toLocaleString('en-IN')}`
}
