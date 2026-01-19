export interface User {
    uid: string;
    id?: string; // For UserContext use
    name: string;
    email: string;
    role: 'admin' | 'customer' | 'user';
    phone?: string;
    address?: string;
    city?: string;
    county?: string;
    loyaltyPoints?: number;
    joinDate?: string;
    createdAt?: string;
    status?: 'active' | 'suspended';
}

export interface Product {
    id: string | number;
    name: string;
    price: number;
    category: string;
    subCategory?: string;
    supplier?: string;
    image: string;
    rating: number;
    reviews: number;
    inStock: boolean;
    stockQuantity: number;
    lowStockThreshold: number;
    description?: string;
    tags?: string[];
    features?: string[];
    specification?: string;
    howToUse?: string;
    stock?: number; // Legacy/Compat
}

export interface Order {
    id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    phone?: string;
    date: string;
    total: number;
    subtotal?: number;
    shippingCost: number;
    discountAmount?: number;
    couponCode?: string | null;
    paymentMethod: string;
    shippingAddress: {
        county: string;
        details: string;
        method?: string;
    };
    paymentStatus?: 'Paid' | 'Unpaid';
    status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
    items: OrderItem[];
    createdAt?: string; // Compat
    notificationPreferences?: string[];
    returnStatus?: 'Requested' | 'Approved' | 'Rejected';
    returnReason?: string;
}

export interface OrderItem {
    id: string | number;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

export interface CartItem extends Product {
    quantity: number;
}
