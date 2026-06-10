import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';
import {
    DateRange, filterByRange, computeKPIs,
    revenueSeries, topProducts, revenueByCategory, revenueByCounty,
    newVsRepeat, ordersByDayOfWeek, ordersByHourOfDay, paymentMethodMix,
} from '@/lib/analytics-aggregations';
import type { Order } from '@/types';

interface CachedInsight {
    range: DateRange;
    generatedAt: string;
    insights: string;
    snapshot: any;
}

const CACHE_DOC = 'aiInsights/latest';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function summariseForPrompt(orders: Order[], range: DateRange) {
    const ranged = filterByRange(orders, range);
    const kpis = computeKPIs(ranged);
    const series = revenueSeries(ranged, range === '7d' ? 'day' : range === '30d' ? 'day' : 'week');
    const products = topProducts(ranged, 10);
    const categories = revenueByCategory(ranged);
    const counties = revenueByCounty(ranged).slice(0, 6);
    const segments = newVsRepeat(ranged);
    const dow = ordersByDayOfWeek(ranged);
    const hourly = ordersByHourOfDay(ranged).filter(b => b.orders > 0);
    const paymentMix = paymentMethodMix(ranged);

    return {
        windowDays: range === 'all' ? null : Number(range.replace(/[^\d]/g, '')) || null,
        kpis,
        revenueTrend: series.slice(-30),
        topProducts: products,
        categories,
        topCounties: counties,
        segments,
        dayOfWeek: dow,
        hourOfDay: hourly,
        paymentMix,
    };
}

async function loadAdminOrders(): Promise<Order[]> {
    const snap = await adminDb.collection('orders').limit(1500).get();
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Order[];
}

async function readCache(range: DateRange): Promise<CachedInsight | null> {
    try {
        const doc = await adminDb.doc(CACHE_DOC).get();
        if (!doc.exists) return null;
        const data = doc.data() as CachedInsight | undefined;
        if (!data) return null;
        if (data.range !== range) return null;
        const age = Date.now() - new Date(data.generatedAt).getTime();
        if (!Number.isFinite(age) || age > CACHE_TTL_MS) return null;
        return data;
    } catch {
        return null;
    }
}

async function writeCache(insight: CachedInsight) {
    try {
        await adminDb.doc(CACHE_DOC).set(insight);
    } catch (e) {
        console.warn('[ai-insights] cache write failed:', e);
    }
}

export async function POST(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return NextResponse.json({
            success: false,
            message: 'AI Insights are not configured. Set ANTHROPIC_API_KEY in your environment to enable. See README_ENV.md.',
            configurationRequired: true,
        }, { status: 503 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const range: DateRange = body?.range || '30d';
        const force: boolean = body?.force === true;

        if (!force) {
            const cached = await readCache(range);
            if (cached) {
                return NextResponse.json({
                    success: true,
                    cached: true,
                    generatedAt: cached.generatedAt,
                    range: cached.range,
                    insights: cached.insights,
                    snapshot: cached.snapshot,
                });
            }
        }

        const orders = await loadAdminOrders();
        const snapshot = summariseForPrompt(orders, range);

        const client = new Anthropic({ apiKey });

        const SYSTEM_PROMPT = `You are a senior agribusiness analyst for Mel-Agri, a Kenyan online agrovet selling certified seeds, fertilizers, agrochemicals, animal feeds, and farm tools to farmers across all 47 counties. You read live e-commerce metrics and produce clear, prioritized weekly briefings.

Your output style:
- Open with a one-line headline of the most important thing this week.
- Then "Top 3 actions" — each a single bold sentence with the concrete action and a justifying number from the data.
- Then "What's working" (1-2 bullets) and "What needs attention" (1-2 bullets).
- Optional: a final "Outlook" paragraph if there's a clear trend.

Style rules:
- Use Markdown: **bold**, bullet lists, no headings deeper than h3.
- Never invent numbers. Quote KES amounts or counts only if they appear in the data.
- Currency is KES. Use Kenyan context where relevant (county names, common crops, the agricultural calendar).
- Be specific and operational, not vague. "Restock NPK" not "improve inventory".
- ≤ 350 words.`;

        const userPrompt = `Here is Mel-Agri's live performance snapshot for the **${range}** window. Read it carefully and write your briefing.

\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\`

Notes:
- KPIs are paid orders only. \`refundedRevenue\` and \`cancelledCount\` cover the same window.
- \`revenueTrend\` is bucket-by-bucket (day or week depending on range).
- \`topProducts\` are ranked by revenue, top 10.
- \`topCounties\` are the highest-revenue delivery destinations (Kenyan counties).
- \`paymentMix\` shows how customers actually paid (M-Pesa is dominant in Kenya).
- If a section is empty (e.g. no orders this week), call that out explicitly — don't fabricate.

Now produce the briefing.`;

        const response = await client.messages.create({
            model: 'claude-opus-4-7',
            max_tokens: 16000,
            system: [
                { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
            ],
            messages: [{ role: 'user', content: userPrompt }],
            thinking: { type: 'adaptive' },
            output_config: { effort: 'high' },
        });

        const textBlocks = response.content.filter((b: any) => b.type === 'text') as Array<{ text: string }>;
        const insights = textBlocks.map(b => b.text).join('\n').trim();

        if (!insights) {
            return NextResponse.json({
                success: false,
                message: 'AI returned an empty response — please retry.',
            }, { status: 502 });
        }

        const generatedAt = new Date().toISOString();
        const cached: CachedInsight = { range, generatedAt, insights, snapshot };
        await writeCache(cached);

        return NextResponse.json({
            success: true,
            cached: false,
            generatedAt,
            range,
            insights,
            snapshot,
            usage: response.usage,
        });
    } catch (error: any) {
        if (error instanceof Anthropic.RateLimitError) {
            return NextResponse.json({ success: false, message: 'AI rate-limited. Try again in a minute.' }, { status: 429 });
        }
        if (error instanceof Anthropic.AuthenticationError) {
            return NextResponse.json({ success: false, message: 'Invalid Anthropic API key.' }, { status: 401 });
        }
        if (error instanceof Anthropic.APIError) {
            console.error('[ai-insights] Anthropic API error:', error);
            return NextResponse.json({ success: false, message: error.message || 'AI service error' }, { status: error.status || 500 });
        }
        console.error('[ai-insights] error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }
    try {
        const url = new URL(request.url);
        const range = (url.searchParams.get('range') as DateRange) || '30d';
        const cached = await readCache(range);
        return NextResponse.json({
            success: true,
            cached: !!cached,
            generatedAt: cached?.generatedAt || null,
            range: cached?.range || range,
            insights: cached?.insights || null,
            snapshot: cached?.snapshot || null,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}
