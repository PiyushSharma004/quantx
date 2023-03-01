// ── WebSocket Tick Broadcast Service ────────────────────────────────────────
import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Server } from 'http'
import { getInstruments } from './marketDataService.js'
import type { WsMessage, TickPayload } from '../types/index.js'

let wss: WebSocketServer | null = null

function send<T>(ws: WebSocket, msg: WsMessage<T>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

function broadcast<T>(msg: WsMessage<T>) {
  wss?.clients.forEach(client => send(client as WebSocket, msg))
}

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    console.log('[WS] Client connected — total:', wss!.clients.size)

    // Immediately send a snapshot of all current prices
    const snapshot: WsMessage<TickPayload[]> = {
      type:      'TICK',
      payload:   getInstruments().map(i => ({
        symbol:    i.symbol,
        ltp:       i.ltp,
        changePct: i.changePct,
        volume:    i.volume,
      })),
      timestamp: new Date().toISOString(),
    }
    send(ws, snapshot)

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'PING') send(ws, { type: 'PONG', payload: null, timestamp: new Date().toISOString() })
      } catch { /* ignore malformed messages */ }
    })

    ws.on('close', () => console.log('[WS] Client disconnected — remaining:', wss!.clients.size))
    ws.on('error', err  => console.error('[WS] Error:', err.message))
  })

  // Broadcast ticks every 1.5 s
  setInterval(() => {
    if (!wss?.clients.size) return
    const ticks: WsMessage<TickPayload[]> = {
      type:      'TICK',
      payload:   getInstruments().map(i => ({
        symbol:    i.symbol,
        ltp:       i.ltp,
        changePct: i.changePct,
        volume:    i.volume,
      })),
      timestamp: new Date().toISOString(),
    }
    broadcast(ticks)
  }, 1500)
}

export function broadcastOrderUpdate(payload: unknown): void {
  broadcast({ type: 'ORDER_UPDATE', payload, timestamp: new Date().toISOString() })
}
