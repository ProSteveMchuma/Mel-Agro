
export interface WhatsAppOrderDetails {
    orderId: string;
    items: {
        name: string;
        quantity: number;
        price: number;
    }[];
    total: number;
    userName: string;
    phone: string;
    address: string;
}

export const generateWhatsAppMessage = (details: WhatsAppOrderDetails) => {
    const itemLines = details.items.map(
        item => `• ${item.name} (x${item.quantity}) - KES ${item.price.toLocaleString()}`
    ).join('\n');

    const message = `*NEW ORDER FROM MEL-AGRI*\n\n` +
        `*Order ID:* #${details.orderId.slice(0, 8)}\n` +
        `*Customer:* ${details.userName}\n` +
        `*Phone:* ${details.phone}\n` +
        `*Delivery Address:* ${details.address}\n\n` +
        `*Items:*\n${itemLines}\n\n` +
        `*TOTAL:* KES ${details.total.toLocaleString()}\n\n` +
        `Please confirm this order.`;

    return encodeURIComponent(message);
};

export const getWhatsAppUrl = (message: string) => {
    const phoneNumber = '254748970757'; // Admin WhatsApp number
    return `https://wa.me/${phoneNumber}?text=${message}`;
};

export const generateWhatsAppProductInquiry = (productName: string, price: number) => {
    const message = `*PRODUCT INQUIRY*\n\n` +
        `I am interested in buying: *${productName}*\n` +
        `Price: KES ${price.toLocaleString()}\n\n` +
        `Is this available?`;

    return encodeURIComponent(message);
};
