// ── Shared UI Components ──────────────────────────────────────────────────────
import type { ReactNode } from 'react'

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.9s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="var(--muted)" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

interface AsyncViewProps<T> {
  data:     T | null
  loading:  boolean
  error:    string | null
  children: (data: T) => ReactNode
  skeleton?: ReactNode
}

export function AsyncView<T>({ data, loading, error, children, skeleton }: AsyncViewProps<T>) {
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px', color: 'var(--sub)', fontSize: '12px' }}>
      {skeleton ?? <><Spinner /> Loading…</>}
    </div>
  )
  if (error) return (
    <div style={{ padding: '24px', color: 'var(--red)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
      ⚠ {error}
    </div>
  )
  if (!data) return null
  return <>{children(data)}</>
}

export function Badge({ label, variant = 'bull' }: { label: string; variant?: 'bull' | 'bear' | 'neut' | 'info' }) {
  const colors = {
    bull: { bg: 'rgba(0,200,83,.10)',  color: 'var(--accent)' },
    bear: { bg: 'rgba(255,82,82,.10)', color: 'var(--red)' },
    neut: { bg: 'rgba(255,215,64,.10)',color: 'var(--yellow)' },
    info: { bg: 'rgba(68,138,255,.10)',color: 'var(--blue)' },
  }[variant]
  return (
    <span style={{
      background: colors.bg, color: colors.color,
      padding: '2px 7px', borderRadius: '4px',
      fontSize: '9px', fontWeight: 700, letterSpacing: '.5px',
    }}>
      {label}
    </span>
  )
}

export function Divider() {
  return <div style={{ height: '1px', background: 'var(--border)', margin: '0' }} />
}
