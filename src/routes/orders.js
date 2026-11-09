import { Hono } from 'hono';
import ordersData from '../../data/orders.json';
import { sendSuccess, sendError } from '../utils/response';
export const ordersRouter = new Hono();
const scenarioDataMap = ordersData.scenarios;
const orderList = ordersData.list;
function resolveScenario(orderSn, scenarioParam) {
    if (scenarioParam && scenarioParam in scenarioDataMap) {
        return scenarioParam;
    }
    const upperSn = orderSn.toUpperCase();
    if (upperSn.includes('UNMAPPED'))
        return 'unmapped';
    if (upperSn.includes('COD'))
        return 'cod';
    if (upperSn.includes('VOUCHER'))
        return 'voucher';
    if (upperSn.includes('CANCEL'))
        return 'cancelled';
    return 'mapped';
}
ordersRouter.get('/list', (c) => {
    const page = Math.max(1, Number(c.req.query('page') || 1));
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('page_size') || 25)));
    const scenario = c.req.query('scenario');
    const keyword = (c.req.query('keyword') || '').trim().toLowerCase();
    const status = c.req.query('status') || c.req.query('order_status');
    const shopId = c.req.query('shop_id');
    let filtered = [...orderList];
    if (scenario && scenario in scenarioDataMap) {
        filtered = filtered.filter((o) => o.scenario === scenario);
    }
    if (keyword) {
        filtered = filtered.filter((o) => o.order_number.toLowerCase().includes(keyword) ||
            o.omisell_order_number.toLowerCase().includes(keyword));
    }
    if (status) {
        const statusNumber = Number(status);
        if (!Number.isNaN(statusNumber)) {
            filtered = filtered.filter((o) => o.status_id === statusNumber);
        }
    }
    if (shopId) {
        const shopIdNumber = Number(shopId);
        if (!Number.isNaN(shopIdNumber)) {
            filtered = filtered.filter((o) => o.shop_id === shopIdNumber);
        }
    }
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);
    const totalCount = filtered.length;
    const baseUrl = c.req.url.split('?')[0];
    const nextPage = start + pageSize < totalCount ? `${baseUrl}?page=${page + 1}&page_size=${pageSize}` : null;
    const prevPage = page > 1 ? `${baseUrl}?page=${page - 1}&page_size=${pageSize}` : null;
    const results = paginated.map((o) => ({
        order_number: o.order_number,
        omisell_order_number: o.omisell_order_number,
        created_time: o.created_time,
        updated_time: o.updated_time,
        escrow_release_time: o.escrow_release_time,
        shop_id: o.shop_id,
        status_id: o.status_id,
        status_name: o.status_name,
        is_fulfilled: o.is_fulfilled
    }));
    return sendSuccess(c, {
        count: totalCount,
        next: nextPage,
        previous: prevPage,
        results
    });
});
ordersRouter.post('/cancel', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const orderSn = body.order_sn || body.omisell_order_number || 'UNKNOWN_ORDER';
    const reason = body.cancel_reason || 'Cancelled by Odoo system';
    const baseOrder = scenarioDataMap.cancelled;
    const cancelledResponse = {
        ...baseOrder,
        omisell_order_number: orderSn,
        order_number: body.order_number || `ORD-${orderSn}`,
        status_id: 900,
        status_name: 'CANCELLED',
        cancel_reason: reason,
        updated_time: Math.floor(Date.now() / 1000)
    };
    return sendSuccess(c, cancelledResponse, 'Order cancelled successfully');
});
ordersRouter.patch('/:omisell_order_number/cancel', async (c) => {
    const orderSn = c.req.param('omisell_order_number');
    const body = await c.req.json().catch(() => ({}));
    const reason = body.cancel_reason || body.note || 'Customer changed mind';
    const baseOrder = scenarioDataMap.cancelled;
    const cancelledResponse = {
        ...baseOrder,
        omisell_order_number: orderSn,
        order_number: `ORD-${orderSn}`,
        status_id: 900,
        status_name: 'CANCELLED',
        cancel_reason: reason,
        updated_time: Math.floor(Date.now() / 1000)
    };
    return sendSuccess(c, cancelledResponse, 'Order cancelled successfully');
});
ordersRouter.post('/:omisell_order_number/cancel', async (c) => {
    const orderSn = c.req.param('omisell_order_number');
    const body = await c.req.json().catch(() => ({}));
    const reason = body.cancel_reason || body.note || 'Customer changed mind';
    const baseOrder = scenarioDataMap.cancelled;
    const cancelledResponse = {
        ...baseOrder,
        omisell_order_number: orderSn,
        order_number: `ORD-${orderSn}`,
        status_id: 900,
        status_name: 'CANCELLED',
        cancel_reason: reason,
        updated_time: Math.floor(Date.now() / 1000)
    };
    return sendSuccess(c, cancelledResponse, 'Order cancelled successfully');
});
ordersRouter.post('/add', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const orderNumber = body.order_number || `ORD-${Date.now()}`;
    const omisellOrderNumber = `ODVN${Date.now()}`;
    const createdOrder = {
        order_number: orderNumber,
        omisell_order_number: omisellOrderNumber,
        status_id: 300,
        status_name: 'Đã duyệt',
        created_time: Math.floor(Date.now() / 1000),
        items_count: Array.isArray(body.items) ? body.items.length : 1
    };
    return sendSuccess(c, createdOrder, 'Order created successfully', 201);
});
ordersRouter.get('/:omisell_order_number/finance', (c) => {
    const orderSn = c.req.param('omisell_order_number');
    const scenarioParam = c.req.query('scenario');
    const selectedScenario = resolveScenario(orderSn, scenarioParam);
    const baseOrder = scenarioDataMap[selectedScenario] || scenarioDataMap.mapped;
    if (!baseOrder.finance) {
        return sendError(c, 'Finance information not found for this order', 404);
    }
    return sendSuccess(c, baseOrder.finance);
});
ordersRouter.get('/:omisell_order_number', (c) => {
    const orderSn = c.req.param('omisell_order_number');
    const scenarioParam = c.req.query('scenario');
    const isDynamic = c.req.query('dynamic') === 'true' || orderSn.toUpperCase() === 'DH-RANDOM';
    const selectedScenario = resolveScenario(orderSn, scenarioParam);
    const baseOrder = scenarioDataMap[selectedScenario] || scenarioDataMap.mapped;
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    const resolvedOrderSn = isDynamic ? `ODVN${Date.now()}` : orderSn;
    const resolvedOrderNumber = isDynamic
        ? `DH-${Date.now()}`
        : (orderSn === 'ODVN260805F24CA2C0' ? 'DH-0001' : orderSn);
    const detailedOrder = {
        ...baseOrder,
        omisell_order_number: resolvedOrderSn,
        order_number: resolvedOrderNumber,
        created_time: isDynamic ? currentTimeSeconds : baseOrder.created_time,
        updated_time: currentTimeSeconds
    };
    return sendSuccess(c, detailedOrder);
});
