import { Hono } from 'hono'
import shipmentsData from '../../data/shipments.json'
import { sendSuccess } from '../utils/response'

export const shipmentsRouter = new Hono()

shipmentsRouter.get('/list', (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1))
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('page_size') || 25)))
  const totalCount = shipmentsData.list.length

  const baseUrl = c.req.url.split('?')[0]
  const nextPage = pageSize < totalCount ? `${baseUrl}?page=2&page_size=${pageSize}` : null

  return sendSuccess(c, {
    count: totalCount,
    next: nextPage,
    previous: null,
    results: shipmentsData.list
  })
})

shipmentsRouter.post('/book', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const courier = body.courier_name || 'SPX Express'
  const trackingNumber = `TRK${Date.now()}VN`

  const bookedShipment = {
    ...shipmentsData.sample_detail,
    courier: {
      name: courier,
      service_code: 'STD_SERVICE',
      service_name: 'Dịch vụ tiêu chuẩn'
    },
    courier_tracking_number: trackingNumber,
    shipping_label_url: `https://mock-omisell.example.com/labels/${trackingNumber}.pdf`,
    created_time: Math.floor(Date.now() / 1000),
    status_id: 300,
    status_name: 'Ready to ship'
  }

  return sendSuccess(c, bookedShipment, 'Shipment booked successfully', 201)
})

shipmentsRouter.post('/add', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const orderNumber = body.omisell_order_number || `ODVN${Date.now()}`
  const shipmentNumber = `SPVN${Date.now()}`
  const trackingNumber = `TRK${Date.now()}VN`

  const newShipment = {
    ...shipmentsData.sample_detail,
    omisell_order_number: orderNumber,
    omisell_shipment_number: shipmentNumber,
    courier_tracking_number: trackingNumber,
    created_time: Math.floor(Date.now() / 1000)
  }

  return sendSuccess(c, newShipment, 'Shipment added successfully', 201)
})

shipmentsRouter.get('/:shipment_id', (c) => {
  const shipmentId = c.req.param('shipment_id')
  const detail = {
    ...shipmentsData.sample_detail,
    omisell_shipment_number: shipmentId,
    courier_tracking_number: `TRK${shipmentId}VN`
  }

  return sendSuccess(c, detail)
})
