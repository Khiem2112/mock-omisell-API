export interface ProductListingPlatform {
  platform: string
  platform_name: string
  shop_id: number
  shop_name: string
  listing_id: string
  listing_sku: string
  stock: number
  price: number
}

export interface ProductVariantItem {
  variant_id: number
  product_id: number
  name: string
  sku: string
  esku: string
  barcode: string
  cost: number
  sale_price: number
  declared_value: number
  weight: number
  stock: number
  stock_on_hand: number
  options: Array<{ name: string; value: string }>
}

export interface ProductItem {
  product_id: number
  sku: string
  esku: string
  barcode: string
  name: string
  avatar: string
  images: string[]
  description: string
  category_id: number | null
  brand: number
  brand_name: string
  unit: number
  unit_name: string
  cost: number
  sale_price: number
  declared_value: number
  tax: number | null
  currency: string
  weight: number
  volume: string
  tag: string
  product_type: string
  product_validation: string | null
  is_active: boolean
  is_bulky: boolean
  is_dropship: boolean
  is_hide_name: boolean
  is_serial_number: number
  is_customize_packaging: number
  min_quantity: number
  eta_of_purchase: number
  last_active_time: number
  price_by_2week: number
  value_by_2week: number
  reserved_by_flashsale: number
  stock: number
  stock_on_hand: number
  stock_buffer: number
  stock_committed: number
  stock_incoming: number
  stock_approve_shipment: number
  stock_on_shipment: number
  count_linked: number
  count_variant: number
  vendor_id: number | null
  vendor_product_id: number | null
  vendor_product_sku: string | null
  platforms: ProductListingPlatform[]
  variants: ProductVariantItem[]
  created_time: number
  updated_time: number
}

export interface OrderCatalogueItem {
  order_item_id: number
  catalogue_sku: string
  product_name: string | null
  quantity: number
  weight: number
  original_price: number
  discounted_price: number
  is_gift: boolean
  is_combo: boolean
  discount_seller: number
  discount_platform: number
  voucher_seller: number
  voucher_platform: number
  warehouse_code: string
}

export interface OrderInvoiceLine {
  quantity: number
  unit_price_before_tax: number
  unit_price_after_tax: number
  amount_before_tax: number
  vat_amount: number
  total: number
}

export interface OrderInventoryItem {
  order_item_id: number
  catalogue_sku: string
  inventory_sku: string
  esku: string
  product_name: string
  unit_name: string | null
  quantity: number
  sale_price: number
  sale_price_before_tax: number
  sale_amount: number
  invoice_lines: OrderInvoiceLine[]
  serial_numbers: string[]
  tax_vat: number
  vendor_pickup_id: number | string
  vendor_pickup_code: string | null
  vendor_name: string
  vendor_id: number
}

export interface OrderParcel {
  package_number: string
  pickup_id: number
  pickup_code: string
  shipping_fee: number
  catalogue_items: OrderCatalogueItem[]
  inventory_items: OrderInventoryItem[]
}

export interface OrderPaymentInfo {
  origin_payment_method: string
  payment_method: string
  payment_method_name: string
  transaction_amount: number
  transaction_status: number
  transaction_status_name: string
  transaction_code: string
  transaction_external_code: string
  transaction_reference: string
  transaction_time: number
  transaction_note: string
}

export interface OrderInvoiceInfo {
  code: string | null
  company: string | null
  fullname: string
  email: string
  phone: string
  address: string | null
  zip_code: string | null
  commune: string | null
  district: string | null
  province: string | null
  country: string | null
}

export interface OrderReceiverInfo {
  fullname: string
  email: string
  phone: string
  address: string
  country: string
  zip_code: string
  province: string
  province_id: number
  district: string
  district_id: number
  subdistrict_name: string | null
  subdistrict_id: number | null
}

export interface OrderShippingInfo {
  origin_shipping_fee: number
  buyer_shipping_fee: number
  seller_shipping_fee: number
  platform_ship_rebate: number
  seller_ship_rebate: number
  wrong_weight_adjustment: number
}

export interface OrderVoucherCode {
  name: string
  code: string
  amount: string
}

export interface WebhookTriggerPayload {
  target_webhook_url: string
  event_type?: string
  order_number?: string
  scenario?: string
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  error: boolean
  error_code: number
  attr_error: string | null
  messages: string
  request_id: string
}
