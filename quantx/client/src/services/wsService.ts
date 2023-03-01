// ── WebSocket Client Service ─────────────────────────────────────────────────
// Manages a single persistent WS connection with auto-reconnect.

import type { WsMessage, TickPayload } from '../types'

type TickHandler  = (ticks: TickPayload[]) => void
type OrderHandler = (order: unknown) => void

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}/ws`

class QuantXWebSocket {
  private ws:           WebSocket | null = null
  private tickHandlers: Set<TickHandler>  = new Set()
  private orderHandlers: Set<OrderHandler> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 2000
  private shouldConnect  = false

  connect() {
    this.shouldConnect = true
    this._open()
  }

  disconnect() {
    this.shouldConnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  onTick(handler: TickHandler)   { this.tickHandlers.add(handler);  return () => this.tickHandlers.delete(handler)  }
  onOrder(handler: OrderHandler) { this.orderHandlers.add(handler); return () => this.orderHandlers.delete(handler) }

  private _open() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        console.log('[WS] Connected')
        this.reconnectDelay = 2000
        // Keepalive ping every 25s
        const pingId = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN)
            this.ws.send(JSON.stringify({ type: 'PING' }))
        }, 25000)
        this.ws!.onclose = () => { clearInterval(pingId); this._onClose() }
      }

      this.ws.onmessage = (evt: MessageEvent) => {
        try {
          const msg = JSON.parse(evt.data) as WsMessage
          if (msg.type === 'TICK')         this.tickHandlers.forEach(h => h(msg.payload as TickPayload[]))
          if (msg.type === 'ORDER_UPDATE') this.orderHandlers.forEach(h => h(msg.payload))
        } catch { /* ignore parse errors */ }
      }

      this.ws.onerror = () => { /* onclose fires after onerror */ }

    } catch (e) {
      console.warn('[WS] Failed to open:', e)
      this._scheduleReconnect()
    }
  }

  private _onClose() {
    console.log('[WS] Disconnected')
    if (this.shouldConnect) this._scheduleReconnect()
  }

  private _scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms...`)
      this._open()
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000)
    }, this.reconnectDelay)
  }
}

// Singleton — one connection for the whole app
export const wsService = new QuantXWebSocket()
