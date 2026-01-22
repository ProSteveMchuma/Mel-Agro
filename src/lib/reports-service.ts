import { Order } from '@/context/OrderContext';

export interface ReportingStats {
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byDate: Record<string, number>;
}

export const aggregateOrderData = (orders: Order[], startDate?: Date, endDate?: Date): ReportingStats => {
    let filteredOrders = orders;

    if (startDate) {
        filteredOrders = filteredOrders.filter(o => new Date(o.date) >= startDate);
    }
    if (endDate) {
        filteredOrders = filteredOrders.filter(o => new Date(o.date) <= endDate);
    }

    const stats: ReportingStats = {
        totalRevenue: 0,
        orderCount: filteredOrders.length,
        avgOrderValue: 0,
        byStatus: {},
        byCategory: {},
        byDate: {},
    };

    filteredOrders.forEach(order => {
        stats.totalRevenue += order.total;

        // By Status
        stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;

        // By Date
        const dateKey = new Date(order.date).toLocaleDateString().split('T')[0];
        stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + order.total;

        // By Category (requires looking at items)
        order.items.forEach((item: any) => {
            const category = item.category || 'Uncategorized';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + (item.price * item.quantity);
        });
    });

    stats.avgOrderValue = stats.orderCount > 0 ? stats.totalRevenue / stats.orderCount : 0;

    return stats;
};
