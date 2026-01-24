import { Order } from "@/types";

export const CommunicationTemplates = {
    getOrderConfirmation: (order: Order) => {
        const orderIdShort = order.id.slice(0, 5).toUpperCase();
        const userName = order.userName || "Farmer";

        // SMS & WhatsApp (Brief & Actionable)
        const smsBody = `Habari ${userName}, your Mel-Agro order #${orderIdShort} has been received! We are prepping your items for dispatch. Total: KES ${order.total.toLocaleString()}. Thank you for farming with us!`;

        // Email (Detailed & Professional)
        const emailSubject = `Order Confirmed - Mel-Agro #${orderIdShort}`;
        const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
                <div style="background: #22c55e; padding: 40px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">Order Received!</h1>
                    <p style="margin-top: 10px; opacity: 0.9;">Order Reference: #${orderIdShort}</p>
                </div>
                <div style="padding: 40px;">
                    <p>Habari <strong>${userName}</strong>,</p>
                    <p>Thank you for choosing Mel-Agro. We've received your order and our team is currently processing it. Here's a brief summary:</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 30px 0;">
                        <h3 style="margin-top: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Order Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            ${order.items.map(item => `
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                        ${item.name} x ${item.quantity}
                                    </td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">
                                        KES ${(item.price * item.quantity).toLocaleString()}
                                    </td>
                                </tr>
                            `).join('')}
                            <tr>
                                <td style="padding: 20px 0 0 0; font-weight: bold; font-size: 18px;">Total</td>
                                <td style="padding: 20px 0 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #22c55e;">
                                    KES ${order.total.toLocaleString()}
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <p>We will notify you via SMS when your order has been shipped.</p>
                    
                    <div style="text-align: center; margin-top: 40px;">
                        <a href="https://mel-agro.com/dashboard/user" style="background: #22c55e; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Track Order Status</a>
                    </div>
                </div>
                <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                    &copy; ${new Date().getFullYear()} Mel-Agro Kenya. All rights reserved.
                </div>
            </div>
        `;

        return {
            subject: emailSubject,
            emailBody: emailHtml,
            smsBody: smsBody
        };
    },

    getStatusUpdate: (order: Order, status: string) => {
        const orderIdShort = order.id.slice(0, 5).toUpperCase();
        return {
            subject: `Order Update - Mel-Agro #${orderIdShort}`,
            smsBody: `Habari ${order.userName || 'Farmer'}, your Mel-Agro order #${orderIdShort} status is now: ${status}. Thank you for farming with us!`,
            emailBody: `<h1>Order Update</h1><p>Your order #${orderIdShort} is now <strong>${status}</strong>.</p>`
        };
    }
};
