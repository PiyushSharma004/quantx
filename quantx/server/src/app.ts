// ── Express App Factory ──────────────────────────────────────────────────────
import express from 'express'
import cors    from 'cors'
import helmet  from 'helmet'
import morgan  from 'morgan'
import rateLimit from 'express-rate-limit'

import apiRouter            from './routes/api.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  // ── Security & parsing ──
  app.use(helmet())
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // ── Logging ──
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  // ── Rate limiting ──
  app.use('/api', rateLimit({
    windowMs: 60 * 1000,   // 1 minute
    max:      200,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { ok: false, error: 'Too many requests', code: 'RATE_LIMIT' },
  }))

  // ── Routes ──
  app.use('/api', apiRouter)

  // ── Error handling ──
  app.use(notFound)
  app.use(errorHandler)

  return app
}
