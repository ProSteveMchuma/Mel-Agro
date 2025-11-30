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

    // Stripe Payment Intent
    processCardPayment: async (cardDetails: any, amount: number): Promise<PaymentResult> => {
        try {
            const response = await fetch('/api/payment/stripe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, currency: 'kes' }),
            });
            const data = await response.json();
            return {
                success: data.success,
                message: data.success ? "Payment Intent Created" : data.message,
                clientSecret: data.clientSecret
            };
        } catch (error) {
            console.error("Stripe Payment Error:", error);
            return { success: false, message: "Failed to process card payment." };
        }
    }
};
