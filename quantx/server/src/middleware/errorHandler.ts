// ── Global Error Middleware ──────────────────────────────────────────────────
import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' })
}

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = (err as { status?: number }).status ?? 500
  const isDev  = process.env.NODE_ENV === 'development'

  console.error('[ERROR]', err.message, isDev ? err.stack : '')

  res.status(status).json({
    ok:      false,
    error:   isDev ? err.message : 'Internal server error',
    code:    'SERVER_ERROR',
    ...(isDev && { stack: err.stack }),
  })
}
