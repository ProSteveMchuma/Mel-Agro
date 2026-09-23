// Browser SMS facade is sealed — destinations must not be chosen in the client.
// Server paths use notifyCustomer / sendServerSms instead.

export const SmsService = {
    sendOrderUpdate: async (_phoneNumber: string, _orderId: string, _status: string, _name?: string) => {
        console.warn('SmsService.sendOrderUpdate is disabled; use server notifyCustomer');
        return { success: false, disabled: true };
    },
};
