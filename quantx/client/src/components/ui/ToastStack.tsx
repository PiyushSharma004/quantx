// ── Toast System ─────────────────────────────────────────────────────────────
import { useToasts, useStore } from '../../hooks'

export default function ToastStack() {
  const toasts      = useToasts()
  const dismissToast = useStore(s => s.dismissToast)

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            color: 'var(--text)',
            boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            animation: 'slideUp .2s ease',
            maxWidth: '340px',
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
          {t.message}
        </div>
      ))}
      <style>{`@keyframes slideUp { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  )
}
