export const getMpesaErrorMessage = (resultCode: number | string): string => {
    const codes: Record<string, string> = {
        '1': 'The balance is insufficient for the transaction.',
        '1032': 'You cancelled the transaction on your phone.',
        '1037': 'The transaction timed out. Please try again.',
        '2001': 'The initiator information is invalid (e.g. wrong PIN).',
        '17': 'The transaction was rejected by Safaricom.',
        '1019': 'The transaction has already been processed.',
        '0': 'Success'
    };
    return codes[String(resultCode)] || 'An error occurred during payment. Please check your phone or try again.';
};

export function formatKenyanPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('0')) return `254${cleaned.slice(1)}`;
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) return `254${cleaned}`;
    return cleaned;
}

export const MPESA_RESULT_CODES = {
    SUCCESS: '0',
    INSUFFICIENT_FUNDS: '1',
    USER_CANCELLED: '1032',
    TIMEOUT: '1037',
    INVALID_INITIATOR: '2001',
    REJECTED: '17',
    DUPLICATE: '1019',
} as const;

export interface STKPushParams {
    phoneNumber: string;
    amount: number;
    accountReference?: string;
    transactionDesc?: string;
}

export interface ReversalParams {
    transactionId: string;
    amount: number;
    remarks?: string;
    occasion?: string;
}

export interface TransactionStatusParams {
    transactionId: string;
    originatorConversationId?: string;
    remarks?: string;
}

export interface RegisterC2BParams {
    confirmationURL: string;
    validationURL: string;
    responseType?: 'Completed' | 'Cancelled';
    shortCode?: string;
}
