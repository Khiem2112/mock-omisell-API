import { Hono } from 'hono'
import { sendSuccess } from '../utils/response'

export const authRouter = new Hono()

const createTokenPayload = () => {
  const now = Math.floor(Date.now() / 1000)
  const token = 'mock_jwt_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjM0NSwic2VsbGVyX2lkIjoiU0VMTEVSXzAwMSIsImV4cCI6MTc5Mzc4ODgwMH0'
  const refreshToken = 'mock_refresh_token_789xyz123abc456'

  return {
    token,
    access_token: token,
    refresh_token: refreshToken,
    expired_time: now + 86400,
    refresh_expired_time: now + 86400 * 15,
    expires_in: 86400,
    token_type: 'Bearer',
    seller_id: 27001999
  }
}

authRouter.post('/oauth/access_token', (c) => {
  return sendSuccess(c, createTokenPayload())
})

authRouter.post('/oauth/refresh_token', (c) => {
  return sendSuccess(c, createTokenPayload())
})

authRouter.post('/token/get', (c) => {
  return sendSuccess(c, createTokenPayload())
})

authRouter.post('/token/get/', (c) => {
  return sendSuccess(c, createTokenPayload())
})

authRouter.post('/token/refresh', (c) => {
  return sendSuccess(c, createTokenPayload())
})

authRouter.post('/token/refresh/', (c) => {
  return sendSuccess(c, createTokenPayload())
})
