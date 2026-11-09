import { Hono } from 'hono'
import productsData from '../../data/products.json'
import categoriesData from '../../data/categories.json'
import { sendSuccess, sendError } from '../utils/response'
import type { ProductItem } from '../types'

export const productsRouter = new Hono()

const products: ProductItem[] = productsData as ProductItem[]

productsRouter.get('/list', (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1))
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('page_size') || 25)))
  const keyword = (c.req.query('keyword') || '').trim().toLowerCase()

  let filtered = products
  if (keyword) {
    filtered = products.filter((p) =>
      p.name.toLowerCase().includes(keyword) ||
      p.sku.toLowerCase().includes(keyword) ||
      p.barcode.toLowerCase().includes(keyword) ||
      p.esku.toLowerCase().includes(keyword)
    )
  }

  const start = (page - 1) * pageSize
  const paginated = filtered.slice(start, start + pageSize)
  const totalCount = filtered.length

  const baseUrl = c.req.url.split('?')[0]
  const nextPage = start + pageSize < totalCount ? `${baseUrl}?page=${page + 1}&page_size=${pageSize}` : null
  const prevPage = page > 1 ? `${baseUrl}?page=${page - 1}&page_size=${pageSize}` : null

  const results = paginated.map((p) => ({
    avatar: p.avatar,
    product_id: p.product_id,
    vendor_id: p.vendor_id,
    vendor_product_id: p.vendor_product_id,
    vendor_product_sku: p.vendor_product_sku,
    name: p.name,
    sku: p.sku,
    esku: p.esku,
    unit_name: p.unit_name,
    category_id: p.category_id,
    cost: p.cost,
    sale_price: p.sale_price,
    declared_value: p.declared_value,
    tax: p.tax,
    currency: p.currency,
    weight: p.weight,
    volume: p.volume,
    images: p.images,
    created_time: p.created_time,
    updated_time: p.updated_time,
    count_variant: p.count_variant
  }))

  return sendSuccess(c, {
    count: totalCount,
    next: nextPage,
    previous: prevPage,
    results
  })
})

productsRouter.get('/category', (c) => {
  const parentIdParam = c.req.query('parent_category_id')
  const keyword = (c.req.query('keyword') || '').trim().toLowerCase()

  let filtered = categoriesData
  if (parentIdParam !== undefined) {
    const parentId = Number(parentIdParam) || null
    filtered = filtered.filter((cat) => cat.parent_id === parentId)
  }
  if (keyword) {
    filtered = filtered.filter((cat) =>
      cat.name.toLowerCase().includes(keyword) ||
      cat.name_locale.toLowerCase().includes(keyword)
    )
  }

  return sendSuccess(c, {
    count: filtered.length,
    next: null,
    previous: null,
    results: filtered
  })
})

productsRouter.get('/sku/:sku', (c) => {
  const sku = c.req.param('sku')
  const matched = products.find(
    (p) =>
      p.sku.toLowerCase() === sku.toLowerCase() ||
      p.barcode.toLowerCase() === sku.toLowerCase() ||
      p.esku.toLowerCase() === sku.toLowerCase()
  )

  if (!matched) {
    return sendError(c, `Product SKU ${sku} not found`, 404)
  }

  return sendSuccess(c, matched)
})

productsRouter.get('/:product_id', (c) => {
  const productId = Number(c.req.param('product_id'))
  const matched = products.find((p) => p.product_id === productId)

  if (!matched) {
    return sendError(c, `Product ID ${productId} not found`, 404)
  }

  return sendSuccess(c, matched)
})

productsRouter.post('/add', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const newProduct: ProductItem = {
    product_id: Date.now(),
    name: body.name || 'Sản phẩm mới tạo',
    sku: body.sku || `SKU-${Date.now()}`,
    esku: body.esku || body.sku || `ERP-${Date.now()}`,
    barcode: body.barcode || `${Date.now()}`,
    avatar: body.avatar || 'https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/default.png',
    images: Array.isArray(body.images) ? body.images : [],
    description: body.description || '<div>Mô tả sản phẩm mới</div>',
    category_id: body.category_id || 1,
    brand: body.brand || 63174,
    brand_name: body.brand_name || 'Thương hiệu đối tác',
    unit: 75745,
    unit_name: body.unit_name || 'Đơn vị',
    cost: Number(body.cost) || 0.0,
    sale_price: Number(body.sale_price) || 0.0,
    declared_value: Number(body.declared_value) || Number(body.sale_price) || 0.0,
    tax: body.tax !== undefined ? Number(body.tax) : 10,
    currency: body.currency || 'VND',
    weight: Number(body.weight) || 100,
    volume: body.volume || '10x10x10',
    tag: body.tag || 'san-pham-moi',
    product_type: body.product_type || 'physical',
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: Math.floor(Date.now() / 1000),
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: Number(body.stock_quantity) || 10,
    stock_on_hand: Number(body.stock_quantity) || 10,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 0,
    count_variant: 0,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: Math.floor(Date.now() / 1000),
    updated_time: Math.floor(Date.now() / 1000)
  }

  return sendSuccess(c, newProduct, 'Product created successfully', 201)
})

productsRouter.post('/:product_id/update', async (c) => {
  const productId = Number(c.req.param('product_id'))
  const body = await c.req.json().catch(() => ({}))
  const matched = products.find((p) => p.product_id === productId)

  if (!matched) {
    return sendError(c, `Product ID ${productId} not found`, 404)
  }

  const updatedProduct = {
    ...matched,
    ...body,
    updated_time: Math.floor(Date.now() / 1000)
  }

  return sendSuccess(c, updatedProduct, 'Product updated successfully')
})

productsRouter.post('/inventory/adjust-stock', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const stocks = Array.isArray(body.stocks) ? body.stocks : []
  const processedSkus = stocks.map((s: { sku: string }) => s.sku || 'UNKNOWN')

  return sendSuccess(
    c,
    {
      processed_skus: processedSkus,
      failed_skus: []
    },
    'Adjust stock in processing'
  )
})
