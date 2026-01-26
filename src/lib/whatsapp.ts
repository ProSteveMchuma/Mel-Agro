
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

export const generateAbandonedCartNudge = (userName: string, items: any[], total: number) => {
    const nameStr = userName.split(' ')[0];
    const itemNames = items.slice(0, 2).map(i => i.name).join(', ') + (items.length > 2 ? ' and more' : '');
    const message = `Hello *${nameStr}*! 👋\n\nI noticed you left some items in your Mel-Agri cart (*${itemNames}*).\n\nSeeds and fertilizers are in high demand right now! Would you like me to help you complete your order so you don't miss out?`;
    return encodeURIComponent(message);
};

export const getWhatsAppDirectUrl = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : (cleanPhone.startsWith('254') ? cleanPhone : '254' + cleanPhone);
    return `https://wa.me/${formattedPhone}?text=${message}`;
};
