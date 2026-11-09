import { Hono } from 'hono';
import shopsData from '../../data/shops.json';
import { sendSuccess } from '../utils/response';
export const shopRouter = new Hono();
// Danh sach Shop
shopRouter.get('/shop/list', (c) => {
    return sendSuccess(c, {
        count: shopsData.shops.length,
        next: null,
        previous: null,
        results: shopsData.shops
    });
});
// Danh sach kho lay hang (Pickup Address)
shopRouter.get('/pickup/list', (c) => {
    return sendSuccess(c, {
        count: shopsData.pickups.length,
        next: null,
        previous: null,
        results: shopsData.pickups
    });
});
// WMS Pickup Map (Khong phan trang, tra ve mang danh sach map kho)
shopRouter.get('/pickup/wms-map', (c) => {
    return sendSuccess(c, shopsData.wms_pickups);
});
shopRouter.get('/pickup/wms-map/list', (c) => {
    return sendSuccess(c, shopsData.wms_pickups);
});
// Danh muc quoc gia
shopRouter.get('/location/country', (c) => {
    return sendSuccess(c, {
        count: shopsData.countries.length,
        next: null,
        previous: null,
        results: shopsData.countries
    });
});
shopRouter.get('/country/list', (c) => {
    return sendSuccess(c, {
        count: shopsData.countries.length,
        next: null,
        previous: null,
        results: shopsData.countries
    });
});
// Danh muc tinh thanh theo quoc gia
shopRouter.get('/location/province', (c) => {
    return sendSuccess(c, {
        count: shopsData.provinces.length,
        next: null,
        previous: null,
        results: shopsData.provinces
    });
});
shopRouter.get('/province/list', (c) => {
    return sendSuccess(c, {
        count: shopsData.provinces.length,
        next: null,
        previous: null,
        results: shopsData.provinces
    });
});
// Danh muc quan huyen theo tinh thanh
shopRouter.get('/location/district', (c) => {
    const provinceId = c.req.query('province_id');
    let filtered = shopsData.districts;
    if (provinceId) {
        filtered = filtered.filter((d) => d.province_id === Number(provinceId));
    }
    return sendSuccess(c, {
        count: filtered.length,
        next: null,
        previous: null,
        results: filtered
    });
});
shopRouter.get('/district/list', (c) => {
    const provinceId = c.req.query('province_id');
    let filtered = shopsData.districts;
    if (provinceId) {
        filtered = filtered.filter((d) => d.province_id === Number(provinceId));
    }
    return sendSuccess(c, {
        count: filtered.length,
        next: null,
        previous: null,
        results: filtered
    });
});
// Danh muc phuong xa theo quan huyen
shopRouter.get('/location/subdistrict', (c) => {
    const districtId = c.req.query('district_id');
    let filtered = shopsData.subdistricts;
    if (districtId) {
        filtered = filtered.filter((s) => s.district_id === Number(districtId));
    }
    return sendSuccess(c, {
        count: filtered.length,
        next: null,
        previous: null,
        results: filtered
    });
});
shopRouter.get('/subdistrict/list', (c) => {
    const districtId = c.req.query('district_id');
    let filtered = shopsData.subdistricts;
    if (districtId) {
        filtered = filtered.filter((s) => s.district_id === Number(districtId));
    }
    return sendSuccess(c, {
        count: filtered.length,
        next: null,
        previous: null,
        results: filtered
    });
});
// Danh sach seller cho Partner
shopRouter.get('/seller-by-partner/list', (c) => {
    return sendSuccess(c, {
        count: shopsData.partners.length,
        next: null,
        previous: null,
        results: shopsData.partners
    });
});
