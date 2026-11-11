import { getRequestListener } from '@hono/node-server'
import { app } from './app'

export const config = {
  runtime: 'nodejs'
}

export default getRequestListener(app.fetch)

