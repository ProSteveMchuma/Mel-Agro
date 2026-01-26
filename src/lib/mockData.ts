
export interface Order {
    id: string;
    userId: string;
    userEmail: string;
    items: {
        id: string;
        name: string;
        price: number;
        quantity: number;
    }[];
    total: number;
    status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
    date: string;
    shippingAddress: string;
}

export interface Product {
    id: string | number;
    name: string;
    price: number;
    category: string;
    subCategory?: string;
    productCode?: string;
    image: string;
    rating: number;
    reviews: number;
    inStock: boolean;
    stockQuantity: number;
    lowStockThreshold: number;
    description?: string;
    tags?: string[];
    specification?: string;
    howToUse?: string;
}

export const products: Product[] = [];

export const MOCK_ORDERS: Order[] = [];

// In-memory store simulation
let orders = [...MOCK_ORDERS];

export function getOrders() {
    return orders;
}

export function getUserOrders(email: string) {
    return orders.filter(order => order.userEmail === email);
}

export function updateOrderStatus(orderId: string, status: Order['status']) {
    orders = orders.map(order =>
        order.id === orderId ? { ...order, status } : order
    );
    return orders.find(order => order.id === orderId);
}

export function createOrder(order: Omit<Order, 'id' | 'date' | 'status'>) {
    const newOrder: Order = {
        ...order,
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        status: 'Processing',
    };
    orders = [newOrder, ...orders];
    return newOrder;
}
