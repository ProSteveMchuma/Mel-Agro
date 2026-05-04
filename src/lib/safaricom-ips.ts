const SAFARICOM_DARAJA_RANGES: Array<[string, number]> = [
    ['196.201.214.200', 29],
    ['196.201.214.206', 32],
    ['196.201.213.114', 32],
    ['196.201.214.207', 32],
    ['196.201.214.208', 29],
    ['196.201.213.44', 32],
    ['196.201.212.127', 32],
    ['196.201.212.138', 32],
    ['196.201.212.129', 32],
    ['196.201.212.136', 32],
    ['196.201.212.74', 32],
    ['196.201.212.69', 32],
];

function ipToInt(ip: string): number | null {
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return null;
    let n = 0;
    for (const part of parts) {
        const o = Number(part);
        if (!Number.isInteger(o) || o < 0 || o > 255) return null;
        n = (n << 8) + o;
    }
    return n >>> 0;
}

function inCidr(ip: string, network: string, prefix: number): boolean {
    const ipInt = ipToInt(ip);
    const netInt = ipToInt(network);
    if (ipInt === null || netInt === null) return false;
    if (prefix === 0) return true;
    const mask = prefix === 32 ? 0xffffffff : (~((1 << (32 - prefix)) - 1)) >>> 0;
    return (ipInt & mask) === (netInt & mask);
}

export function isSafaricomIP(ip: string): boolean {
    if (!ip) return false;
    const stripped = ip.replace(/^::ffff:/, '');
    return SAFARICOM_DARAJA_RANGES.some(([net, prefix]) => inCidr(stripped, net, prefix));
}

export function getClientIP(request: Request): string {
    const fwd = request.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
    const real = request.headers.get('x-real-ip');
    if (real) return real.trim();
    const cfConnecting = request.headers.get('cf-connecting-ip');
    if (cfConnecting) return cfConnecting.trim();
    return '';
}

export function verifySafaricomCallback(request: Request): { ok: boolean; ip: string; reason?: string } {
    if (process.env.MPESA_DISABLE_IP_CHECK === 'true' || process.env.MPESA_ENV !== 'production') {
        return { ok: true, ip: getClientIP(request), reason: 'IP check disabled' };
    }
    const ip = getClientIP(request);
    if (!ip) {
        return { ok: false, ip: '', reason: 'Could not determine client IP' };
    }
    if (!isSafaricomIP(ip)) {
        return { ok: false, ip, reason: `IP ${ip} not in Safaricom Daraja range` };
    }
    return { ok: true, ip };
}
