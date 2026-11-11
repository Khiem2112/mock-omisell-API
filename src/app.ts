import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRouter } from './routes/auth'
import { productsRouter } from './routes/products'
import { ordersRouter } from './routes/orders'
import { shipmentsRouter } from './routes/shipments'
import { webhookTriggerRouter } from './routes/webhook_trigger'
import { shopRouter } from './routes/shop'
import { sendSuccess, sendError } from './utils/response'

export const app = new Hono()

app.use('*', cors())

app.get('/', (c) => {
  return sendSuccess(c, {
    name: 'Omisell API v2 Mock Server',
    version: '1.0.0',
    specification: 'Omisell API v2 OpenAPI Standard (https://developers.omisell.com/llms.txt)',
    integration: 'ORIS Hub & Odoo 18 B3 Integration Suite',
    endpoints: {
      auth: [
        'POST /api/v2/public/oauth/access_token',
        'POST /api/v2/public/oauth/refresh_token',
        'POST /api/v2/auth/token/get/',
        'POST /api/v2/auth/token/refresh/'
      ],
      products: [
        'GET /api/v2/public/product/list',
        'GET /api/v2/public/product/:product_id',
        'GET /api/v2/public/product/sku/:sku',
        'GET /api/v2/public/product/category',
        'POST /api/v2/public/product/add',
        'POST /api/v2/public/inventory/adjust-stock'
      ],
      orders: [
        'GET /api/v2/public/order/list',
        'GET /api/v2/public/order/:omisell_order_number',
        'GET /api/v2/public/order/:omisell_order_number/finance',
        'POST /api/v2/public/order/cancel',
        'PATCH /api/v2/public/order/:omisell_order_number/cancel',
        'POST /api/v2/public/order/add'
      ],
      shipments: [
        'GET /api/v2/public/shipment/list',
        'GET /api/v2/public/shipment/:shipment_id',
        'POST /api/v2/public/shipment/book',
        'POST /api/v2/public/shipment/add'
      ],
      locations_and_shops: [
        'GET /api/v2/public/shop/list',
        'GET /api/v2/public/pickup/list',
        'GET /api/v2/public/pickup/wms-map',
        'GET /api/v2/public/location/country',
        'GET /api/v2/public/location/province',
        'GET /api/v2/public/location/district',
        'GET /api/v2/public/location/subdistrict',
        'GET /api/v2/public/seller-by-partner/list'
      ],
      webhook_tool: [
        'POST /api/mock/trigger-webhook'
      ]
    }
  })
})

app.get('/health', (c) => {
  return sendSuccess(c, {
    status: 'ok',
    timestamp: Math.floor(Date.now() / 1000)
  })
})

app.route('/api/v2/auth', authRouter)
app.route('/api/v2/public', authRouter)
app.route('/api/v2/public/product', productsRouter)
app.route('/api/v2/public/order', ordersRouter)
app.route('/api/v2/public/shipment', shipmentsRouter)
app.route('/api/v2/public', productsRouter)
app.route('/api/v2/public', shopRouter)
app.route('/api/mock', webhookTriggerRouter)
app.route('/mock', webhookTriggerRouter)

app.notFound((c) => {
  return sendError(c, `Endpoint ${c.req.path} not found`, 404)
})

app.onError((err, c) => {
  console.error('Unhandled server error:', err)
  return sendError(c, err.message || 'Internal server error', 500)
})


