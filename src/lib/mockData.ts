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
    supplier?: string;
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

export const products: Product[] = [
    {
        id: 1,
        name: "DAP Fertilizer",
        price: 3500,
        category: "Fertilizers",
        image: "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.8,
        reviews: 120,
        inStock: true,
        stockQuantity: 150,
        lowStockThreshold: 20,
        description: "High-quality Diammonium Phosphate fertilizer for planting.",
        tags: ["planting", "roots", "phosphorus", "growth", "soil"]
    },
    {
        id: 2,
        name: "CAN Fertilizer",
        price: 2800,
        category: "Fertilizers",
        image: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.5,
        reviews: 85,
        inStock: true,
        stockQuantity: 80,
        lowStockThreshold: 15,
        description: "Calcium Ammonium Nitrate fertilizer for top dressing.",
        tags: ["top dressing", "nitrogen", "leaves", "growth", "green"]
    },
    {
        id: 3,
        name: "Hybrid Maize Seeds",
        price: 500,
        category: "Seeds",
        image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=1000&auto=format&fit=crop",
        rating: 4.7,
        reviews: 200,
        inStock: true,
        stockQuantity: 300,
        lowStockThreshold: 50,
        description: "High-yield hybrid maize seeds suitable for various climates.",
        tags: ["corn", "planting", "food", "cereal", "grain"]
    },
    {
        id: 4,
        name: "Vegetable Seeds Pack",
        price: 150,
        category: "Seeds",
        image: "https://images.unsplash.com/photo-1591857177580-dc82b9e4e119?q=80&w=1000&auto=format&fit=crop",
        rating: 4.6,
        reviews: 50,
        inStock: true,
        stockQuantity: 25,
        lowStockThreshold: 10,
        description: "Assorted vegetable seeds including kales, spinach, and tomatoes.",
        tags: ["sukuma wiki", "spinach", "tomato", "kitchen garden", "greens"]
    },
    {
        id: 5,
        name: "Pest Control Spray",
        price: 1200,
        category: "Pesticides",
        image: "https://images.unsplash.com/photo-1615485925763-867862f80930?q=80&w=1000&auto=format&fit=crop",
        rating: 4.4,
        reviews: 90,
        inStock: true,
        stockQuantity: 45,
        lowStockThreshold: 10,
        description: "Effective broad-spectrum pesticide for common crop pests.",
        tags: ["bugs", "insects", "worms", "aphids", "protection", "medicine"]
    },
    {
        id: 6,
        name: "Knapsack Sprayer",
        price: 4500,
        category: "Equipment",
        image: "https://images.unsplash.com/photo-1589923188900-85dae5233271?q=80&w=1000&auto=format&fit=crop",
        rating: 4.9,
        reviews: 45,
        inStock: true,
        stockQuantity: 12,
        lowStockThreshold: 5,
        description: "Durable 16L knapsack sprayer for easy application of agrochemicals.",
        tags: ["pump", "spray", "tool", "garden", "manual"]
    },
    {
        id: 7,
        name: "Dairy Meal",
        price: 2800,
        category: "Animal Feeds",
        image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?q=80&w=1000&auto=format&fit=crop",
        rating: 4.7,
        reviews: 110,
        inStock: true,
        stockQuantity: 60,
        lowStockThreshold: 15,
        description: "Nutrient-rich dairy meal to boost milk production.",
        tags: ["cow", "milk", "livestock", "food", "nutrition"]
    },
    {
        id: 8,
        name: "Chicken Feeds (Layers)",
        price: 3200,
        category: "Animal Feeds",
        image: "https://images.unsplash.com/photo-1563205764-6e929f62334d?q=80&w=1000&auto=format&fit=crop",
        rating: 4.5,
        reviews: 75,
        inStock: true,
        stockQuantity: 40,
        lowStockThreshold: 10,
        description: "Balanced feed for laying hens to ensure high egg production.",
        tags: ["poultry", "eggs", "hen", "chicks", "bird"]
    },
    {
        id: 'new-1',
        name: "Ambition AKTIVATOR",
        price: 1400,
        category: "Fertilizers",
        subCategory: "Foliar",
        supplier: "Bayer Crop Science",
        image: "/images/products/ambition.jpg",
        rating: 4.8,
        reviews: 0,
        inStock: true,
        stockQuantity: 100,
        lowStockThreshold: 10,
        description: "High-quality foliar fertilizer by Bayer Crop Science. Boosts plant vitality and yield.",
        specification: "1 Litre, 5 Litres",
        howToUse: "Rate of use: 50ml/20L",
        tags: ["foliar", "bayer", "booster", "growth"]
    },
    {
        id: 'new-2',
        name: "Kale 1,000 Headed (Royal Seed)",
        price: 1500,
        category: "Seeds",
        subCategory: "Vegetable seed",
        supplier: "Royal Seed",
        image: "/images/products/kale.jpg",
        rating: 4.7,
        reviews: 0,
        inStock: true,
        stockQuantity: 200,
        lowStockThreshold: 20,
        description: "High-yield Kale seeds. Drought tolerant and high production.",
        specification: "500g",
        howToUse: "Planting time: All seasons. Germination: 10-14 days. Maturity 40-60 days.",
        tags: ["kale", "seeds", "vegetable", "royal seed"]
    },
    {
        id: 'new-3',
        name: "Prazipet Plus",
        price: 1600,
        category: "Animal Health",
        subCategory: "Animal Drugs",
        supplier: "UltraVetis",
        image: "/images/products/prazipet.jpg",
        rating: 4.9,
        reviews: 0,
        inStock: true,
        stockQuantity: 50,
        lowStockThreshold: 5,
        description: "Comprehensive dewormer for dogs and cats.",
        specification: "2*10 Tablets",
        howToUse: "1 Tablet per 10 KG Weight",
        tags: ["dewormer", "dogs", "cats", "veterinary"]
    },
    {
        id: 'new-4',
        name: "New Pal Dog Shampoo",
        price: 1100,
        category: "Animal",
        subCategory: "Soap",
        supplier: "Aesthetics Pet Care",
        image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=1000&auto=format&fit=crop",
        rating: 4.5,
        reviews: 0,
        inStock: true,
        stockQuantity: 30,
        lowStockThreshold: 5,
        description: "Gentle soap for dogs. Cleans and protects the coat.",
        specification: "1 Litre",
        howToUse: "Mix 100ml with 1 liter of water. Lather and rinse.",
        tags: ["shampoo", "dog", "cleaning", "pet care"]
    },
    {
        id: 'new-5',
        name: "Osho Foliar Fertilizer",
        price: 300,
        category: "Fertilizers",
        subCategory: "Foliar",
        supplier: "Osho Chemical Limited",
        image: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=1000&auto=format&fit=crop",
        rating: 4.6,
        reviews: 0,
        inStock: true,
        stockQuantity: 150,
        lowStockThreshold: 20,
        description: "Versatile foliar fertilizer for various crops.",
        specification: "500g",
        howToUse: "Rate of use: 40g/20L",
        tags: ["foliar", "osho", "fertilizer", "growth"]
    }
];

export const MOCK_ORDERS: Order[] = [
    {
        id: 'ORD-1001',
        userId: 'user1',
        userEmail: 'test@example.com',
        items: [
            { id: '1', name: 'DAP Fertilizer', price: 3500, quantity: 2 },
            { id: '3', name: 'Hybrid Maize Seeds', price: 500, quantity: 4 },
        ],
        total: 9000,
        status: 'Processing',
        date: '2023-11-25',
        shippingAddress: 'P.O. Box 123, Nairobi',
    },
    {
        id: 'ORD-1002',
        userId: 'user2',
        userEmail: 'farmer@local.com',
        items: [
            { id: '5', name: 'Pest Control', price: 1200, quantity: 1 },
        ],
        total: 1200,
        status: 'Delivered',
        date: '2023-11-20',
        shippingAddress: 'P.O. Box 456, Nakuru',
    },
    {
        id: 'ORD-1003',
        userId: 'user1',
        userEmail: 'test@example.com',
        items: [
            { id: '7', name: 'Dairy Meal', price: 2800, quantity: 3 },
        ],
        total: 8400,
        status: 'Shipped',
        date: '2023-11-22',
        shippingAddress: 'P.O. Box 123, Nairobi',
    },
];

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
