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

/** Safaricom receipt codes are 8–12 alphanumeric characters (usually 10). */
export function normalizeMpesaReceipt(raw: unknown): string {
    return String(raw || '').replace(/[\s-]/g, '').toUpperCase();
}

export function isValidMpesaReceipt(code: string): boolean {
    return /^[A-Z0-9]{8,12}$/.test(code);
}

export const MPESA_RESULT_CODES = {
    SUCCESS: '0',
    INSUFFICIENT_FUNDS: '1',
    USER_CANCELLED: '1032',
    TIMEOUT: '1037',
    INVALID_INITIATOR: '2001',
    REJECTED: '17',
    DUPLICATE: '1019',
    IN_FLIGHT: '500.001.1001',
} as const;

/** STK query is still processing. Timeout (1037) and cancel (1032) are terminal. */
export function isStkQueryInFlight(data: { ResultCode?: string | number; errorCode?: string } | null | undefined): boolean {
    if (!data) return true;
    const resultCode = data.ResultCode !== undefined && data.ResultCode !== null ? String(data.ResultCode) : '';
    const errorCode = data.errorCode ? String(data.errorCode) : '';
    if (errorCode === MPESA_RESULT_CODES.IN_FLIGHT || resultCode === MPESA_RESULT_CODES.IN_FLIGHT) return true;
    return !resultCode;
}

export function checkoutIdsToQuery(
    order: { checkoutRequestId?: string; checkoutRequestIds?: unknown },
    preferred?: string,
): string[] {
    const ids: string[] = [];
    const add = (id?: unknown) => {
        if (typeof id === 'string' && id && !ids.includes(id)) ids.push(id);
    };
    add(preferred);
    add(order.checkoutRequestId);
    if (Array.isArray(order.checkoutRequestIds)) {
        for (const id of order.checkoutRequestIds) add(id);
    }
    return ids.slice(0, 5);
}

export type StkQueryProbe = {
    checkoutRequestId: string;
    resultCode?: string;
    resultDesc?: string;
    data: { ResultCode?: string | number; errorCode?: string; ResultDesc?: string } | null | undefined;
};

/** Prefer a successful historic STK over a later timeout/cancel on retry. */
export function resolveStkQueryProbes(results: StkQueryProbe[]): {
    outcome: 'paid' | 'pending' | 'failed';
    resultCode?: string;
    resultDesc?: string;
    checkoutRequestId?: string;
    data?: StkQueryProbe['data'];
} {
    const paid = results.find((result) => String(result.resultCode ?? '') === MPESA_RESULT_CODES.SUCCESS);
    if (paid) {
        return {
            outcome: 'paid',
            resultCode: MPESA_RESULT_CODES.SUCCESS,
            resultDesc: paid.resultDesc,
            checkoutRequestId: paid.checkoutRequestId,
            data: paid.data,
        };
    }

    const pending = results.find((result) => isStkQueryInFlight(result.data));
    if (pending) {
        return {
            outcome: 'pending',
            resultCode: pending.resultCode,
            resultDesc: pending.resultDesc,
            checkoutRequestId: pending.checkoutRequestId,
            data: pending.data,
        };
    }

    const failed = results[0];
    return {
        outcome: 'failed',
        resultCode: failed?.resultCode,
        resultDesc: failed?.resultDesc,
        checkoutRequestId: failed?.checkoutRequestId,
        data: failed?.data,
    };
}

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
