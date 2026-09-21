export type DocumentTemplateSettings = {
    invoiceTitle: string;
    footerText: string;
    terms: string;
    showLogo: boolean;
    primaryColor: string;
};

export const DEFAULT_DOCUMENT_SETTINGS: DocumentTemplateSettings = {
    invoiceTitle: 'INVOICE',
    footerText: 'Thank you for your business!',
    terms: 'Payment is due within 30 days.',
    showLogo: true,
    primaryColor: '#16a34a',
};

export type DocumentBrandingInput = {
    companyName?: string;
    address?: string;
    supportPhone?: string;
    supportEmail?: string;
    websiteUrl?: string;
    taxId?: string;
    logoUrl?: string;
};

export function resolveDocumentBranding(input: DocumentBrandingInput = {}) {
    const website = String(input.websiteUrl || '').replace(/^https?:\/\//i, '').replace(/\/$/, '') || 'melagri.com';
    return {
        companyName: input.companyName || 'Mel-Agri Kenya',
        address: input.address || 'Nairobi, Kenya',
        supportPhone: input.supportPhone || '0788 970757',
        supportEmail: input.supportEmail || 'support@Mel-Agri.com',
        websiteUrl: website,
        taxId: input.taxId || '',
        logoUrl: input.logoUrl || '',
    };
}
