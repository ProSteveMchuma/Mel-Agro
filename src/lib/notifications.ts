/**
 * Browser-facing notification helpers are intentionally inert.
 * All real SMS/email/WhatsApp delivery goes through server-only
 * `notifyCustomer` / `sendServerSms` paths so destinations cannot be forged.
 */
export type NotifyChannel = 'sms' | 'email' | 'whatsapp';

export const NotificationService = {
    sendEmail: async (_to: string, _subject: string, _body: string) => {
        console.warn('NotificationService.sendEmail is disabled; use server notifyCustomer');
        return { success: false, disabled: true };
    },
    sendSMS: async (_to: string, _message: string) => {
        console.warn('NotificationService.sendSMS is disabled; use server notifyCustomer');
        return { success: false, disabled: true };
    },
    sendWhatsApp: async (_to: string, _message: string) => {
        console.warn('NotificationService.sendWhatsApp is disabled; use server notifyCustomer');
        return { success: false, disabled: true };
    },
    notify: async (
        _channels: NotifyChannel[],
        _contact: { email?: string; phone?: string },
        _message: { smsBody?: string; emailSubject?: string; emailBody?: string },
    ) => {
        console.warn('NotificationService.notify is disabled; use server notifyCustomer');
        return { success: false, disabled: true };
    },
};
