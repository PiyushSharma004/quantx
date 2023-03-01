// ── App Shell Layout ──────────────────────────────────────────────────────────
import type { ReactNode } from 'react'
import Sidebar   from '../layout/Sidebar'
import RightRail from '../layout/RightRail'
import TopBar    from '../layout/TopBar'
import TabNav    from '../layout/TabNav'

interface Props { children: ReactNode }

export default function AppShell({ children }: Props) {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar />
        <TabNav />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
      <RightRail />
    </div>
  )
}
