import { app } from '../src/app'

async function runTests() {
  console.log('Bat dau kiem tra toan dien he thong Omisell Mock Server theo chuan OpenAPI...')

  // Kiem tra endpoint /health
  const resHealth = await app.request('/health')
  const healthData = await resHealth.json()
  console.log('Health check status:', resHealth.status, 'Response:', healthData.data?.status)
  if (resHealth.status !== 200) throw new Error('Health check that bai')

  // Kiem tra lay token qua auth endpoint
  const resAuth = await app.request('/api/v2/public/oauth/access_token', { method: 'POST' })
  const authData = await resAuth.json()
  console.log('Auth status:', resAuth.status, 'Token:', authData.data?.token?.substring(0, 20) + '...', 'Expires in:', authData.data?.expires_in)
  if (!authData.data?.token) throw new Error('Auth token bi thieu')

  // Kiem tra endpoint Bruno auth token get
  const resBrunoAuth = await app.request('/api/v2/auth/token/get/', { method: 'POST' })
  const brunoAuthData = await resBrunoAuth.json()
  console.log('Bruno auth status:', resBrunoAuth.status, 'Token exists:', Boolean(brunoAuthData.data?.token))

  // Kiem tra danh sach san pham theo chuan OpenAPI
  const resProdList = await app.request('/api/v2/public/product/list?page=1&page_size=5')
  const prodListData = await resProdList.json()
  console.log('Product list count:', prodListData.data?.count, 'Results length:', prodListData.data?.results?.length)
  const firstProd = prodListData.data?.results?.[0]
  console.log('Sample product item fields check:', {
    name: firstProd?.name,
    sku: firstProd?.sku,
    esku: firstProd?.esku,
    weight: firstProd?.weight,
    avatar: Boolean(firstProd?.avatar)
  })
  if (!prodListData.data?.results?.length) throw new Error('Product list bi rong')

  // Kiem tra chi tiet san pham day du theo ID
  const resProdDetail = await app.request('/api/v2/public/product/207')
  const prodDetailData = await resProdDetail.json()
  console.log('Product 207 detail brand:', prodDetailData.data?.brand_name, 'Variants count:', prodDetailData.data?.variants?.length)
  if (prodDetailData.data?.sku !== 'DELL-V3020') throw new Error('Product 207 SKU sai lech')

  // Kiem tra chi tiet san pham theo SKU
  const resProdSku = await app.request('/api/v2/public/product/sku/MATCHA01')
  const prodSkuData = await resProdSku.json()
  console.log('Product MATCHA01 detail:', prodSkuData.data?.name, 'Price:', prodSkuData.data?.sale_price)
  if (prodSkuData.data?.sku !== 'MATCHA01') throw new Error('Product MATCHA01 sai lech')

  // Kiem tra danh muc san pham
  const resCat = await app.request('/api/v2/public/product/category')
  const catData = await resCat.json()
  console.log('Categories count:', catData.data?.count, 'First category:', catData.data?.results?.[0]?.name)

  // Kiem tra dieu chinh ton kho
  const resAdjustStock = await app.request('/api/v2/public/inventory/adjust-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stocks: [
        { pickup_id: 21, sku: 'DELL-V3020', quantity_adjusted: 5, reason: 'Kiem ke' }
      ]
    })
  })
  const adjustData = await resAdjustStock.json()
  console.log('Adjust stock message:', adjustData.messages, 'Processed SKUs:', adjustData.data?.processed_skus)

  // Kiem tra danh sach don hang
  const resOrderList = await app.request('/api/v2/public/order/list')
  const orderListData = await resOrderList.json()
  console.log('Order list count:', orderListData.data?.count, 'First order:', orderListData.data?.results?.[0]?.order_number)

  // Kiem tra chi tiet don hang kich ban mapped
  const resOrderMapped = await app.request('/api/v2/public/order/ODVN260805F24CA2C0?scenario=mapped')
  const orderMappedData = await resOrderMapped.json()
  console.log('Mapped order number:', orderMappedData.data?.order_number, 'Receiver:', orderMappedData.data?.receiver?.fullname)
  console.log('Parcels count:', orderMappedData.data?.parcels?.length, 'Payment method:', orderMappedData.data?.payment_information?.[0]?.payment_method_name)

  // Kiem tra tai chinh don hang
  const resOrderFinance = await app.request('/api/v2/public/order/ODVN260805F24CA2C0/finance?scenario=mapped')
  const orderFinanceData = await resOrderFinance.json()
  console.log('Order finance gross sales:', orderFinanceData.data?.gross_sales, 'Paid amount:', orderFinanceData.data?.paid_amount)
  if (!orderFinanceData.data?.gross_sales) throw new Error('Order finance bi thieu')

  // Kiem tra don hang kich ban unmapped
  const resOrderUnmapped = await app.request('/api/v2/public/order/ODVN2608UNMAPPED?scenario=unmapped')
  const orderUnmappedData = await resOrderUnmapped.json()
  const unmappedSku = orderUnmappedData.data?.parcels?.[0]?.catalogue_items?.[0]?.catalogue_sku
  console.log('Unmapped order first item SKU:', unmappedSku)
  if (unmappedSku !== 'SRM-100') throw new Error('Unmapped scenario SKU sai lech')

  // Kiem tra don hang kich ban dynamic
  const resOrderDynamic = await app.request('/api/v2/public/order/DH-RANDOM?dynamic=true')
  const orderDynamicData = await resOrderDynamic.json()
  console.log('Dynamic order number:', orderDynamicData.data?.order_number, 'Created time:', orderDynamicData.data?.created_time)

  // Kiem tra huy don hang
  const resCancel = await app.request('/api/v2/public/order/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_sn: 'DH-0001', cancel_reason: 'Khach doi y' })
  })
  const cancelData = await resCancel.json()
  console.log('Cancel order status:', cancelData.data?.status_name)

  // Kiem tra shipment list va shipment detail
  const resShipmentList = await app.request('/api/v2/public/shipment/list')
  const shipmentListData = await resShipmentList.json()
  console.log('Shipment list count:', shipmentListData.data?.count)

  const resShipmentDetail = await app.request('/api/v2/public/shipment/SPVN260728600605E9')
  const shipmentDetailData = await resShipmentDetail.json()
  console.log('Shipment tracking number:', shipmentDetailData.data?.courier_tracking_number, 'Carrier:', shipmentDetailData.data?.courier?.name)

  // Kiem tra locations va shops
  const resShop = await app.request('/api/v2/public/shop/list')
  const shopData = await resShop.json()
  console.log('Shop list count:', shopData.data?.count, 'First shop name:', shopData.data?.results?.[0]?.name)

  const resPickup = await app.request('/api/v2/public/pickup/list')
  const pickupData = await resPickup.json()
  console.log('Pickup list count:', pickupData.data?.count)

  const resWms = await app.request('/api/v2/public/pickup/wms-map')
  const wmsData = await resWms.json()
  console.log('WMS pickup map items:', wmsData.data?.length)

  // Kiem tra trigger webhook validation
  const resWebhookMissing = await app.request('/api/mock/trigger-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  console.log('Webhook validation status:', resWebhookMissing.status)
  if (resWebhookMissing.status !== 400) throw new Error('Webhook missing url validation that bai')

  console.log('Tat ca kiem tra he thong Omisell Mock Server da hoan thanh thanh cong, dat chuan OpenAPI!')
}

runTests().catch((err) => {
  console.error('Kiem tra that bai:', err)
  process.exit(1)
})
