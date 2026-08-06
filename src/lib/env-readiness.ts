export const CORE_ENV_KEYS = [
    'NEXT_PUBLIC_BASE_URL',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
] as const;

export const PRODUCTION_ENV_GROUPS = {
    mpesa: [
        'MPESA_CONSUMER_KEY',
        'MPESA_CONSUMER_SECRET',
        'MPESA_PASSKEY',
        'MPESA_SHORTCODE',
        'MPESA_TILL_NUMBER',
        'MPESA_CALLBACK_URL',
    ],
    paystack: ['PAYSTACK_SECRET_KEY', 'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY'],
    email: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'],
    sms: ['AFRICASTALKING_API_KEY', 'AFRICASTALKING_USERNAME'],
    whatsapp: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER'],
} as const;

type Environment = Record<string, string | undefined>;

export interface EnvironmentReadiness {
    ready: boolean;
    coreReady: boolean;
    productionReady: boolean;
    missingCore: string[];
    missingByService: Record<keyof typeof PRODUCTION_ENV_GROUPS, string[]>;
    issues: string[];
}

function isConfigured(value: string | undefined) {
    if (!value?.trim()) return false;
    const normalized = value.trim().toLowerCase();
    return !normalized.includes('your_') && !normalized.includes('dummy') && normalized !== 'sandbox';
}

export function getEnvironmentReadiness(env: Environment, requireProductionServices = false): EnvironmentReadiness {
    const missingCore = CORE_ENV_KEYS.filter((key) => !isConfigured(env[key]));
    const missingByService = Object.fromEntries(
        Object.entries(PRODUCTION_ENV_GROUPS).map(([service, keys]) => [
            service,
            keys.filter((key) => !isConfigured(env[key])),
        ]),
    ) as EnvironmentReadiness['missingByService'];

    const issues: string[] = [];
    if (env.NEXT_PUBLIC_BASE_URL && !env.NEXT_PUBLIC_BASE_URL.startsWith('https://')) {
        issues.push('NEXT_PUBLIC_BASE_URL must use HTTPS');
    }
    if (requireProductionServices && env.MPESA_ENV !== 'production') {
        issues.push('MPESA_ENV must be production');
    }
    if (requireProductionServices && env.MPESA_DISABLE_IP_CHECK === 'true') {
        issues.push('MPESA_DISABLE_IP_CHECK must not be true in production');
    }

    const coreReady = missingCore.length === 0 && !issues.some((issue) => issue.startsWith('NEXT_PUBLIC_BASE_URL'));
    const productionReady = Object.values(missingByService).every((missing) => missing.length === 0)
        && !issues.some((issue) => issue.startsWith('MPESA_'));

    return {
        ready: coreReady && (!requireProductionServices || productionReady),
        coreReady,
        productionReady,
        missingCore,
        missingByService,
        issues,
    };
}
