import type { Order } from '@/types';
import { DELIVERY_ZONES, getDeliveryCost } from './delivery.ts';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export interface ProviderIncidentSignal {
    kind: 'provider_incident' | 'customer_friction' | 'callback_delay' | 'healthy';
    severity: 'critical' | 'warning' | 'info';
    failed: number;
    successful: number;
    failureRate: number;
    dominantCode?: string;
    summary: string;
}

const customerCodes = new Set(['1', '1032', '2001']);

export function classifyPaymentHealth(orders: Order[], now = new Date()): ProviderIncidentSignal {
    const recent = orders.filter(order => now.getTime() - new Date(order.date).getTime() <= HOUR_MS);
    const failed = recent.filter(order => order.paymentStatus === 'Failed');
    const successful = recent.filter(order => order.paymentStatus === 'Paid');
    const callbackDelayed = recent.filter(order => {
        const value = order as any;
        const age = now.getTime() - new Date(order.date).getTime();
        return value.checkoutRequestId && !['Paid', 'Failed'].includes(String(value.paymentStatus || '')) && age >= 15 * 60_000;
    });
    const codes = new Map<string, number>();
    for (const order of failed) {
        const code = String((order as any).paymentFailureCode || 'unknown');
        codes.set(code, (codes.get(code) || 0) + 1);
    }
    const dominant = [...codes.entries()].sort((a, b) => b[1] - a[1])[0];
    const failureRate = failed.length + successful.length > 0 ? failed.length / (failed.length + successful.length) * 100 : 0;
    if (callbackDelayed.length >= 3) return { kind: 'callback_delay', severity: 'critical', failed: failed.length, successful: successful.length, failureRate, summary: `${callbackDelayed.length} M-Pesa sessions have awaited callbacks for more than 15 minutes` };
    const providerFailures = failed.filter(order => !customerCodes.has(String((order as any).paymentFailureCode || ''))).length;
    if (providerFailures >= 3 && failureRate >= 30) return { kind: 'provider_incident', severity: 'critical', failed: failed.length, successful: successful.length, failureRate, dominantCode: dominant?.[0], summary: `${providerFailures} likely provider-side failures in the last hour` };
    if (failed.length >= 3 && dominant && customerCodes.has(dominant[0])) return { kind: 'customer_friction', severity: 'warning', failed: failed.length, successful: successful.length, failureRate, dominantCode: dominant[0], summary: `${dominant[1]} customer-action failures share result code ${dominant[0]}` };
    return { kind: 'healthy', severity: 'info', failed: failed.length, successful: successful.length, failureRate, summary: 'No payment-provider incident threshold is currently met' };
}

export interface EtaAccuracy {
    deliveredOrders: number;
    onTimeOrders: number;
    onTimeRate: number;
    averageDeliveryDays: number;
    byCounty: Array<{ county: string; delivered: number; onTime: number; onTimeRate: number; averageDays: number }>;
}

export function deliveryEtaAccuracy(orders: Order[]): EtaAccuracy {
    const delivered = orders.flatMap(order => {
        if (order.status !== 'Delivered' || !order.deliveredAt) return [];
        const start = new Date(order.paidAt || order.date).getTime();
        const end = new Date(order.deliveredAt).getTime();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
        const county = order.shippingAddress?.county || 'Unknown';
        const expected = getDeliveryCost(county, Number(order.subtotal || order.total || 0), DELIVERY_ZONES);
        const days = (end - start) / DAY_MS;
        return [{ county, days, onTime: days <= expected.etaMaxDays + 0.5 }];
    });
    const groups = new Map<string, typeof delivered>();
    for (const item of delivered) groups.set(item.county, [...(groups.get(item.county) || []), item]);
    const onTimeOrders = delivered.filter(item => item.onTime).length;
    return {
        deliveredOrders: delivered.length, onTimeOrders,
        onTimeRate: delivered.length ? onTimeOrders / delivered.length * 100 : 0,
        averageDeliveryDays: delivered.length ? delivered.reduce((sum, item) => sum + item.days, 0) / delivered.length : 0,
        byCounty: [...groups.entries()].map(([county, items]) => ({ county, delivered: items.length, onTime: items.filter(item => item.onTime).length, onTimeRate: items.filter(item => item.onTime).length / items.length * 100, averageDays: items.reduce((sum, item) => sum + item.days, 0) / items.length })).sort((a, b) => a.onTimeRate - b.onTimeRate),
    };
}
