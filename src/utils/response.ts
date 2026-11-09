import type { Context } from 'hono'

export function generateRequestId(): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export function sendSuccess<T>(c: Context, data: T, message = 'success', status: 200 | 201 = 200) {
  const requestId = generateRequestId()
  c.header('X-Omisell-Request-ID', requestId)
  return c.json(
    {
      code: status,
      message,
      data,
      error: false,
      error_code: status,
      attr_error: null,
      messages: '',
      request_id: requestId
    },
    status
  )
}

export function sendError(c: Context, message: string, status: 400 | 401 | 403 | 404 | 500 | 502 = 400, attrError: string | null = null) {
  const requestId = generateRequestId()
  c.header('X-Omisell-Request-ID', requestId)
  return c.json(
    {
      code: status,
      message,
      data: null,
      error: true,
      error_code: status,
      attr_error: attrError,
      messages: message,
      request_id: requestId
    },
    status
  )
}
