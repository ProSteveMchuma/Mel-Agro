import 'server-only';
import { formatKenyanPhone, STKPushParams, ReversalParams, TransactionStatusParams, RegisterC2BParams } from './mpesa';

export type { STKPushParams, ReversalParams, TransactionStatusParams, RegisterC2BParams } from './mpesa';

const PROD_BASE = 'https://api.safaricom.co.ke';
const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';

function getBaseUrl() {
    return process.env.MPESA_ENV === 'production' ? PROD_BASE : SANDBOX_BASE;
}

function getCallbackBaseUrl() {
    return process.env.NEXT_PUBLIC_BASE_URL || process.env.MPESA_CALLBACK_URL?.replace(/\/api\/payment\/mpesa\/callback.*$/, '') || '';
}

export async function getAccessToken() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
        throw new Error("Missing M-Pesa Consumer Key or Secret");
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
            next: { revalidate: 3500 }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch access token');
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("M-Pesa Token Error:", error);
        throw error;
    }
}

export function generatePassword() {
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!shortcode || !passkey) {
        throw new Error("Missing M-Pesa Shortcode or Passkey");
    }

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    return { password, timestamp, shortcode };
}

export async function initiateSTKPush({
    phoneNumber,
    amount,
    accountReference = 'Mel-Agri',
    transactionDesc = 'Order Payment',
}: STKPushParams) {
    const accessToken = await getAccessToken();
    const { password, timestamp, shortcode } = generatePassword();
    const callbackUrl =
        process.env.MPESA_CALLBACK_URL ||
        `${getCallbackBaseUrl()}/api/payment/mpesa/callback`;

    const response = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerBuyGoodsOnline',
            Amount: Math.round(amount),
            PartyA: formatKenyanPhone(phoneNumber),
            PartyB: process.env.MPESA_TILL_NUMBER || shortcode,
            PhoneNumber: formatKenyanPhone(phoneNumber),
            CallBackURL: callbackUrl,
            AccountReference: accountReference,
            TransactionDesc: transactionDesc,
        }),
    });

    return response.json();
}

export async function querySTKStatus(checkoutRequestID: string) {
    const accessToken = await getAccessToken();
    const { password, timestamp, shortcode } = generatePassword();

    const response = await fetch(`${getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID,
        }),
    });

    return response.json();
}

let cachedSecurityCredential: string | null = null;

export async function generateSecurityCredential(): Promise<string> {
    if (cachedSecurityCredential) return cachedSecurityCredential;

    const initiatorPassword = process.env.MPESA_INITIATOR_PASSWORD;
    if (!initiatorPassword) {
        throw new Error('MPESA_INITIATOR_PASSWORD is required for B2C/Reversal/TransactionStatus operations');
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    const crypto = await import('crypto');

    const certFileName = process.env.MPESA_ENV === 'production'
        ? 'ProductionCertificate.cer'
        : 'SandboxCertificate.cer';
    const certPath = process.env.MPESA_PUBLIC_CERT_PATH ||
        path.join(process.cwd(), 'src', 'lib', 'mpesa-certs', certFileName);

    let cert: string;
    try {
        cert = await fs.readFile(certPath, 'utf8');
    } catch (e) {
        throw new Error(
            `M-Pesa public certificate not found at ${certPath}. Download from https://developer.safaricom.co.ke and place at this path, or set MPESA_PUBLIC_CERT_PATH.`
        );
    }

    const encrypted = crypto.publicEncrypt(
        {
            key: cert,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(initiatorPassword)
    );

    cachedSecurityCredential = encrypted.toString('base64');
    return cachedSecurityCredential;
}

export async function reverseTransaction({
    transactionId,
    amount,
    remarks = 'Order refund',
    occasion = 'Refund',
}: ReversalParams) {
    const initiator = process.env.MPESA_INITIATOR_NAME;
    const shortcode = process.env.MPESA_SHORTCODE;

    if (!initiator) {
        throw new Error('MPESA_INITIATOR_NAME is required for reversals');
    }
    if (!shortcode) {
        throw new Error('MPESA_SHORTCODE is required for reversals');
    }

    const securityCredential = await generateSecurityCredential();
    const accessToken = await getAccessToken();
    const callbackBase = getCallbackBaseUrl();

    const response = await fetch(`${getBaseUrl()}/mpesa/reversal/v1/request`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            Initiator: initiator,
            SecurityCredential: securityCredential,
            CommandID: 'TransactionReversal',
            TransactionID: transactionId,
            Amount: Math.round(amount),
            ReceiverParty: shortcode,
            RecieverIdentifierType: '11',
            ResultURL: `${callbackBase}/api/payment/mpesa/reverse-result`,
            QueueTimeOutURL: `${callbackBase}/api/payment/mpesa/reverse-timeout`,
            Remarks: remarks,
            Occasion: occasion,
        }),
    });

    return response.json();
}

export async function queryTransactionStatus({
    transactionId,
    originatorConversationId,
    remarks = 'Status check',
}: TransactionStatusParams) {
    const initiator = process.env.MPESA_INITIATOR_NAME;
    const shortcode = process.env.MPESA_SHORTCODE;

    if (!initiator) throw new Error('MPESA_INITIATOR_NAME is required');
    if (!shortcode) throw new Error('MPESA_SHORTCODE is required');

    const securityCredential = await generateSecurityCredential();
    const accessToken = await getAccessToken();
    const callbackBase = getCallbackBaseUrl();

    const body: Record<string, any> = {
        Initiator: initiator,
        SecurityCredential: securityCredential,
        CommandID: 'TransactionStatusQuery',
        TransactionID: transactionId,
        PartyA: shortcode,
        IdentifierType: '4',
        ResultURL: `${callbackBase}/api/payment/mpesa/status-result`,
        QueueTimeOutURL: `${callbackBase}/api/payment/mpesa/status-timeout`,
        Remarks: remarks,
        Occasion: 'Verification',
    };
    if (originatorConversationId) body.OriginatorConversationID = originatorConversationId;

    const response = await fetch(`${getBaseUrl()}/mpesa/transactionstatus/v1/query`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    return response.json();
}

export async function registerC2BUrls({
    confirmationURL,
    validationURL,
    responseType = 'Completed',
    shortCode,
}: RegisterC2BParams) {
    const accessToken = await getAccessToken();
    const sc = shortCode || process.env.MPESA_SHORTCODE;
    if (!sc) throw new Error('MPESA_SHORTCODE is required');

    const response = await fetch(`${getBaseUrl()}/mpesa/c2b/v2/registerurl`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ShortCode: sc,
            ResponseType: responseType,
            ConfirmationURL: confirmationURL,
            ValidationURL: validationURL,
        }),
    });

    return response.json();
}
