export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    message: string;
    clientSecret?: string; // For Stripe
    checkoutRequestID?: string; // For M-Pesa
}

export const PaymentService = {
    // M-Pesa STK Push
    initiateMpesaPayment: async (phoneNumber: string, amount: number): Promise<PaymentResult> => {
        try {
            const response = await fetch('/api/payment/mpesa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, amount }),
            });
            const data = await response.json();
            return {
                success: data.success,
                message: data.message,
                checkoutRequestID: data.checkoutRequestID
            };
        } catch (error) {
            console.error("M-Pesa Payment Error:", error);
            return { success: false, message: "Failed to initiate M-Pesa payment." };
        }
    },

    // Paystack Card Payment
    processPaystackPayment: async (email: string, amount: number, orderId: string, items: any[]): Promise<any> => {
        try {
            const response = await fetch('/api/payment/paystack/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, amount, orderId, items }),
            });
            return await response.json();
        } catch (error) {
            console.error("Paystack Payment Error:", error);
            return { success: false, message: "Failed to process paystack payment." };
        }
    }
};
