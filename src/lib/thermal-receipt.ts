import type { Order } from '@/types';

export type ThermalWidthMm = 58 | 80;

export type ReceiptBranding = {
    companyName?: string;
    address?: string;
    supportPhone?: string;
};

export type ThermalReceiptLine =
    | { type: 'center'; text: string; bold?: boolean; size?: 'sm' | 'md' | 'lg' }
    | { type: 'row'; left: string; right: string; bold?: boolean }
    | { type: 'rule' }
    | { type: 'blank' };

const DEFAULT_BRANDING: Required<ReceiptBranding> = {
    companyName: 'Mel-Agri Kenya',
    address: 'Nairobi, Kenya',
    supportPhone: '0788 970757',
};

function money(n: number) {
    return `KES ${Number(n || 0).toLocaleString('en-KE')}`;
}

function shortId(id?: string) {
    return String(id || '').slice(0, 8).toUpperCase();
}

function wrapText(text: string, maxChars: number): string[] {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= maxChars) {
            current = next;
            continue;
        }
        if (current) lines.push(current);
        if (word.length <= maxChars) {
            current = word;
        } else {
            // Hard-break very long tokens
            for (let i = 0; i < word.length; i += maxChars) {
                lines.push(word.slice(i, i + maxChars));
            }
            current = '';
        }
    }
    if (current) lines.push(current);
    return lines;
}

/** Character budget for thermal body text (approx at 9–10pt mono). */
export function thermalMaxChars(widthMm: ThermalWidthMm): number {
    return widthMm === 58 ? 28 : 40;
}

export function buildThermalReceiptLines(
    order: Pick<Order, 'id' | 'date' | 'items' | 'total' | 'shippingCost' | 'paymentMethod' | 'paymentStatus'> & {
        mpesaReceiptNumber?: string | null;
        transactionId?: string | null;
    },
    branding: ReceiptBranding = {},
    widthMm: ThermalWidthMm = 80,
): ThermalReceiptLine[] {
    const brand = { ...DEFAULT_BRANDING, ...branding };
    const max = thermalMaxChars(widthMm);
    const lines: ThermalReceiptLine[] = [];

    lines.push({ type: 'center', text: brand.companyName.toUpperCase(), bold: true, size: 'lg' });
    lines.push({ type: 'center', text: 'Premium Agricultural Solutions', size: 'sm' });
    for (const part of wrapText(brand.address, max)) {
        lines.push({ type: 'center', text: part, size: 'sm' });
    }
    lines.push({ type: 'center', text: brand.supportPhone, bold: true, size: 'sm' });
    lines.push({ type: 'rule' });
    lines.push({
        type: 'row',
        left: 'Date',
        right: new Date(order.date || Date.now()).toLocaleString('en-KE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }),
    });
    lines.push({ type: 'row', left: 'Order', right: `#${shortId(order.id)}` });
    if (order.paymentStatus) {
        lines.push({ type: 'row', left: 'Status', right: String(order.paymentStatus) });
    }
    lines.push({ type: 'rule' });

    for (const item of order.items || []) {
        const qty = Number(item.quantity) || 1;
        const lineTotal = (Number(item.price) || 0) * qty;
        const nameLines = wrapText(`${qty} x ${item.name}`, max - 10);
        nameLines.forEach((part, index) => {
            lines.push({
                type: 'row',
                left: part,
                right: index === 0 ? lineTotal.toLocaleString('en-KE') : '',
            });
        });
    }

    lines.push({ type: 'rule' });
    if (Number(order.shippingCost) > 0) {
        lines.push({
            type: 'row',
            left: 'Shipping',
            right: Number(order.shippingCost).toLocaleString('en-KE'),
        });
    }
    lines.push({ type: 'row', left: 'TOTAL', right: money(order.total), bold: true });
    lines.push({
        type: 'row',
        left: 'Payment',
        right: String(order.paymentMethod || 'Online'),
    });
    const receipt = order.mpesaReceiptNumber || order.transactionId;
    if (receipt) {
        lines.push({ type: 'row', left: 'M-Pesa', right: String(receipt) });
    }
    lines.push({ type: 'blank' });
    lines.push({ type: 'center', text: 'Thank you for shopping with us!', size: 'sm' });
    lines.push({ type: 'center', text: 'Keep this receipt for your records.', size: 'sm' });
    lines.push({ type: 'center', text: 'www.melagri.com', bold: true, size: 'sm' });

    return lines;
}

export function estimateThermalHeightMm(lineCount: number, widthMm: ThermalWidthMm = 80): number {
    const lineMm = widthMm === 58 ? 4.2 : 4.6;
    const padding = 12;
    return Math.max(widthMm === 58 ? 80 : 100, Math.ceil(lineCount * lineMm + padding));
}

/**
 * Build a print-ready thermal PDF (default 80mm roll). Returns a Blob.
 * Dynamic import keeps jsPDF out of the initial client bundle.
 */
export async function buildThermalReceiptPdfBlob(args: {
    order: Parameters<typeof buildThermalReceiptLines>[0];
    branding?: ReceiptBranding;
    widthMm?: ThermalWidthMm;
}): Promise<Blob> {
    const widthMm = args.widthMm ?? 80;
    const lines = buildThermalReceiptLines(args.order, args.branding, widthMm);
    const heightMm = estimateThermalHeightMm(lines.length, widthMm);

    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [widthMm, heightMm],
    });

    const margin = widthMm === 58 ? 2 : 3;
    const contentWidth = widthMm - margin * 2;
    let y = margin + 1;

    const fontSize = (size?: 'sm' | 'md' | 'lg') => {
        if (size === 'lg') return widthMm === 58 ? 11 : 12;
        if (size === 'sm') return widthMm === 58 ? 7.5 : 8;
        return widthMm === 58 ? 8.5 : 9;
    };

    for (const line of lines) {
        if (line.type === 'blank') {
            y += 2;
            continue;
        }
        if (line.type === 'rule') {
            doc.setDrawColor(40);
            doc.setLineWidth(0.2);
            doc.setLineDashPattern([0.8, 0.6], 0);
            doc.line(margin, y, widthMm - margin, y);
            doc.setLineDashPattern([], 0);
            y += 3;
            continue;
        }
        if (line.type === 'center') {
            doc.setFont('courier', line.bold ? 'bold' : 'normal');
            doc.setFontSize(fontSize(line.size));
            doc.text(line.text, widthMm / 2, y, { align: 'center', maxWidth: contentWidth });
            y += fontSize(line.size) * 0.45 + 1.2;
            continue;
        }
        // row
        doc.setFont('courier', line.bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize(line.bold ? 'md' : 'sm'));
        const rightWidth = doc.getTextWidth(line.right || ' ');
        const leftMax = Math.max(8, contentWidth - rightWidth - 2);
        const leftLines = doc.splitTextToSize(line.left, leftMax) as string[];
        leftLines.forEach((part, index) => {
            doc.text(part, margin, y);
            if (index === 0 && line.right) {
                doc.text(line.right, widthMm - margin, y, { align: 'right' });
            }
            y += fontSize(line.bold ? 'md' : 'sm') * 0.45 + 1.1;
        });
    }

    return doc.output('blob');
}

export async function downloadThermalReceiptPdf(args: {
    order: Parameters<typeof buildThermalReceiptLines>[0];
    branding?: ReceiptBranding;
    widthMm?: ThermalWidthMm;
    fileName?: string;
}) {
    const blob = await buildThermalReceiptPdfBlob(args);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = args.fileName || `Mel-Agri-Receipt-${shortId(args.order.id)}-${args.widthMm ?? 80}mm.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
