# Omisell API v2 Mock Server (Hono)

Mock Server mô phỏng toàn diện nền tảng Omisell API v2 theo đặc tả OpenAPI chính thức của Omisell (tham chiếu: https://developers.omisell.com/llms.txt), phục vụ việc kết nối, đồng bộ và kiểm thử tự động với ORIS Hub / Odoo 18 B3 và bộ sưu tập Bruno.

Server được xây dựng bằng TypeScript và Hono Framework, lưu trữ dữ liệu tĩnh dạng JSON, tối ưu hóa để chạy kiểm thử cục bộ (Node server) hoặc triển khai trực tiếp lên Vercel Serverless Functions.

---

## Cấu Trúc Thư Mục

```text
mock/omisell-mock/
├── api/
│   └── index.ts               Entrypoint cho Vercel Serverless Function
├── data/
│   ├── products.json          Master data sản phẩm chi tiết theo chuẩn Omisell
│   ├── orders.json            Dữ liệu đơn hàng và tài chính theo các kịch bản
│   ├── shipments.json         Dữ liệu vận đơn và thông tin giao vận
│   ├── categories.json        Cây danh mục sản phẩm chuẩn Omisell
│   └── shops.json             Danh mục Shop, địa chỉ kho và vị trí hành chính
├── src/
│   ├── routes/
│   │   ├── auth.ts            Xác thực OAuth token và refresh token
│   │   ├── products.ts        APIs sản phẩm, danh mục và điều chỉnh tồn kho
│   │   ├── orders.ts          APIs danh sách, chi tiết, tài chính và hủy đơn
│   │   ├── shipments.ts       APIs danh sách, chi tiết và đặt đơn vận chuyển
│   │   ├── webhook_trigger.ts Giả lập bắn webhook sự kiện đơn hàng sang Odoo
│   │   └── shop.ts            APIs danh mục shop, kho, vị trí và đối tác
│   ├── utils/
│   │   └── response.ts        Envelope chuẩn Omisell v2 kèm X-Omisell-Request-ID
│   ├── types.ts               Khai báo kiểu dữ liệu TypeScript theo OpenAPI
│   ├── app.ts                 Định nghĩa ứng dụng Hono chính
│   └── index.ts               Entrypoint khởi chạy Node server cục bộ
├── test/
│   └── test_api.ts            Bộ kiểm thử tự động toàn diện các endpoints
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## Chuẩn Hóa Response Schema Của Omisell

Tất cả các endpoint đều trả về HTTP Header `X-Omisell-Request-ID: <request_id>` và định dạng JSON bọc ngoài chuẩn:

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "error": false,
  "error_code": 200,
  "attr_error": null,
  "messages": "",
  "request_id": "6a7e9da03247762c56ed57c2"
}
```

---

## Danh Sách Endpoint Đã Triển Khai

### Nhóm Xác Thực (Authentication)
- `POST /api/v2/public/oauth/access_token` và `POST /api/v2/auth/token/get/`: Cấp access token, refresh token và thời hạn sử dụng.
- `POST /api/v2/public/oauth/refresh_token` và `POST /api/v2/auth/token/refresh/`: Cấp lại token khi hết hạn.

### Nhóm Sản Phẩm (Products & Inventory)
- `GET /api/v2/public/product/list`: Danh sách sản phẩm phân trang, hỗ trợ tìm kiếm qua `keyword` (name, sku, barcode, esku).
- `GET /api/v2/public/product/:product_id`: Chi tiết sản phẩm đầy đủ (thương hiệu, phân loại, tồn kho, các kênh liên kết, biến thể).
- `GET /api/v2/public/product/sku/:sku`: Chi tiết sản phẩm tra cứu theo SKU hoặc Barcode.
- `GET /api/v2/public/product/category`: Cây danh mục sản phẩm Omisell (hỗ trợ lọc theo `parent_category_id` và `keyword`).
- `POST /api/v2/public/product/add`: Thêm sản phẩm mới.
- `POST /api/v2/public/product/:product_id/update`: Cập nhật thông tin sản phẩm.
- `POST /api/v2/public/inventory/adjust-stock`: Tiếp nhận điều chỉnh tồn kho bất đồng bộ theo lô SKU.

### Nhóm Đơn Hàng (Orders)
- `GET /api/v2/public/order/list`: Danh sách đơn hàng phân trang, lọc theo `status`, `shop_id`, `scenario`, `keyword`.
- `GET /api/v2/public/order/:omisell_order_number`: Chi tiết đơn hàng chuyên sâu (parcels, catalogue_items, inventory_items, invoice_lines, receiver, invoice_information, shipping_information, payment_information, seller_voucher_code).
- `GET /api/v2/public/order/:omisell_order_number/finance`: Báo cáo tài chính đơn hàng chi tiết (gross_sales, net_sales, nmv, paid_amount, commission_fee, service_fee, transaction_fee, voucher_platform, voucher_seller, escrow_amount).
- `POST /api/v2/public/order/cancel` và `PATCH /api/v2/public/order/:omisell_order_number/cancel`: Tiếp nhận lệnh hủy đơn từ Odoo.
- `POST /api/v2/public/order/add`: Tạo đơn hàng mẫu mới.

### Nhóm Giao Vận (Shipments)
- `GET /api/v2/public/shipment/list`: Danh sách kiện hàng vận chuyển.
- `GET /api/v2/public/shipment/:shipment_id`: Chi tiết vận đơn, hãng vận chuyển, mã tracking, lộ trình và nhãn in PDF.
- `POST /api/v2/public/shipment/book`: Đặt hãng giao vận và cấp mã vận đơn mới.
- `POST /api/v2/public/shipment/add`: Tạo kiện hàng mới.

### Nhóm Danh Mục Kho, Vị Trí & Đối Tác
- `GET /api/v2/public/shop/list`: Danh sách cửa hàng trên các sàn (Shopee, TikTok Shop).
- `GET /api/v2/public/pickup/list`: Danh sách địa chỉ kho lấy hàng.
- `GET /api/v2/public/pickup/wms-map`: Bản đồ liên kết kho WMS.
- `GET /api/v2/public/location/country` (hoặc `/country/list`): Danh mục quốc gia.
- `GET /api/v2/public/location/province` (hoặc `/province/list`): Danh mục tỉnh thành.
- `GET /api/v2/public/location/district` (hoặc `/district/list`): Danh mục quận huyện.
- `GET /api/v2/public/location/subdistrict` (hoặc `/subdistrict/list`): Danh mục phường xã.
- `GET /api/v2/public/seller-by-partner/list`: Danh sách tài khoản seller dành cho đối tác.

### Công Cụ Bắn Webhook Sang Odoo
- `POST /api/mock/trigger-webhook`: Giả lập Omisell chủ động đẩy sự kiện webhook (`order.created`, `order.processing`, `order.shipped`, `order.completed`, `order.cancelled`) sang endpoint tiếp nhận của Odoo.

---

## Kịch Bản Kiểm Thử Tham Số Hóa (Scenario Parameters)

Truy vấn tham số `scenario` trên endpoint chi tiết đơn hàng:
- `?scenario=mapped`: Đơn hàng chuẩn chứa mã `DELL-V3020` và `MATCHA01`, đã thanh toán online.
- `?scenario=unmapped`: Đơn hàng chứa mã `SRM-100` và `TONER-150` nhằm kiểm thử ngoại lệ chặn đơn trên Odoo.
- `?scenario=cod`: Đơn hàng thanh toán tiền mặt khi nhận hàng (CoD).
- `?scenario=voucher`: Đơn hàng có voucher sàn 20.000 VND và voucher shop 10.000 VND.
- `?scenario=cancelled`: Đơn hàng ở trạng thái hủy CANCELLED và đã hoàn tiền.
- `?dynamic=true`: Tự động sinh mã đơn và thời gian tạo thời gian thực theo từng giây để kiểm thử Cron Job Odoo.

---

## Hướng Dẫn Vận Hành

Cài đặt các gói phụ thuộc:
```bash
npm install
```

Chạy kiểm thử tự động toàn diện:
```bash
npm test
```

Khởi chạy server cục bộ tại cổng 4000:
```bash
npm run dev
```

Kiểm tra trạng thái server:
```bash
curl http://localhost:4000/health
```

Biên dịch dự án TypeScript:
```bash
npm run build
```

Triển khai trực tiếp lên Vercel:
```bash
vercel
```
