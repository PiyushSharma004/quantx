// ── Server Entry Point ───────────────────────────────────────────────────────
import 'dotenv/config'
import http from 'http'
import { createApp }          from './app.js'
import { initWebSocket }      from './services/wsService.js'
import { startTickSimulation } from './services/marketDataService.js'

const PORT = parseInt(process.env.PORT ?? '4000', 10)

async function main() {
  const app    = createApp()
  const server = http.createServer(app)

  // WebSocket upgrade handler
  initWebSocket(server)

  // Start simulated market ticks (swap with real Kite WebSocket in production)
  startTickSimulation(1500)

  server.listen(PORT, () => {
    console.log(`\n🚀 QuantX API running`)
    console.log(`   REST  → http://localhost:${PORT}/api`)
    console.log(`   WS    → ws://localhost:${PORT}/ws`)
    console.log(`   Env   → ${process.env.NODE_ENV ?? 'development'}\n`)
  })

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`)
    server.close(() => {
      console.log('[Server] HTTP server closed.')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 5000)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

main().catch(err => {
  console.error('[Fatal]', err)
  process.exit(1)
})
