import { Hono } from 'hono';
import { sendSuccess, sendError, generateRequestId } from '../utils/response';
export const webhookTriggerRouter = new Hono();
const eventStatusMap = {
    'order.created': { id: 100, name: 'Chờ duyệt', fulfilled: false },
    'order.processing': { id: 300, name: 'Đã duyệt', fulfilled: false },
    'order.ready_to_ship': { id: 350, name: 'Sẵn sàng giao', fulfilled: false },
    'order.shipped': { id: 400, name: 'Đang giao hàng', fulfilled: false },
    'order.completed': { id: 800, name: 'Giao hàng thành công', fulfilled: true },
    'order.delivered': { id: 800, name: 'Giao hàng thành công', fulfilled: true },
    'order.cancelled': { id: 900, name: 'Đã hủy', fulfilled: false },
    'order.returned': { id: 700, name: 'Đơn trả lại', fulfilled: false },
    'order.return_receive': { id: 750, name: 'Đã nhận hàng trả', fulfilled: false },
    'order.exceptions': { id: 600, name: 'Ngoại lệ giao vận', fulfilled: false }
};
webhookTriggerRouter.post('/trigger-webhook', async (c) => {
    const body = (await c.req.json().catch(() => ({})));
    const targetUrl = body.target_webhook_url;
    if (!targetUrl) {
        return sendError(c, 'target_webhook_url is required', 400, 'target_webhook_url');
    }
    const eventType = body.event_type || 'order.created';
    const eventConfig = eventStatusMap[eventType] || { id: 300, name: eventType, fulfilled: false };
    const currentTime = Math.floor(Date.now() / 1000);
    const orderNumber = body.order_number || `DH-MOCK-${Date.now()}`;
    const omisellOrderNumber = `ODVN${Date.now()}`;
    const requestId = generateRequestId();
    const webhookPayload = {
        data: {
            order_number: orderNumber,
            omisell_order_number: omisellOrderNumber,
            status_id: eventConfig.id,
            status_name: eventConfig.name,
            is_fulfilled: eventConfig.fulfilled,
            created_time: currentTime,
            updated_time: currentTime,
            escrow_release_time: 0,
            shop_id: 11303
        },
        event: eventType,
        shop_id: 11303,
        seller_id: 27001999,
        platform: 'Shopee',
        timestamp: currentTime,
        request_id: requestId
    };
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'mock_webhook_client_secret_xyz'
            },
            body: JSON.stringify(webhookPayload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        let responseData = null;
        const responseText = await response.text();
        try {
            responseData = JSON.parse(responseText);
        }
        catch {
            responseData = responseText;
        }
        return sendSuccess(c, {
            target: targetUrl,
            event_type: eventType,
            odoo_status: response.status,
            odoo_response: responseData,
            dispatched_payload: webhookPayload
        }, 'Webhook dispatched successfully');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return sendError(c, `Failed to push webhook to ${targetUrl}: ${errorMessage}`, 502);
    }
});
