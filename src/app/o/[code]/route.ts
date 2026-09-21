import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/site';
import { resolveShortOrderLink } from '@/lib/short-links';

export const dynamic = 'force-dynamic';

/**
 * SMS short-link resolver: /o/{code} → signed order action URL.
 */
export async function GET(
    _request: Request,
    context: { params: Promise<{ code: string }> },
) {
    const { code } = await context.params;
    const result = await resolveShortOrderLink(code);

    if (!result.ok) {
        const reason = result.status === 410 ? 'expired' : 'invalid';
        return NextResponse.redirect(`${SITE_URL}/auth/login?link=${reason}`, 302);
    }

    return NextResponse.redirect(result.destination, 302);
}
