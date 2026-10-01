import Link from 'next/link';
import type { TodayShopReadout } from '@/lib/shop-journey';

const ACTION_LABEL: Record<string, string> = {
    'text the cart': 'Text the cart',
    restock: 'Restock',
    'fix the page': 'Fix the page',
};

export default function ShopTodayReadout({ readout }: { readout: TodayShopReadout }) {
    const pageLine = readout.pageLoss
        ? `${readout.pageLoss.path} · ${readout.pageLoss.views} views today · no paid order names this page`
        : 'No busy page is without a paid order today.';
    const product = readout.productLoss;
    const productLine = !product
        ? 'No watched product is clearly losing people.'
        : product.reason === 'out of stock'
            ? `${product.name} · out of stock · ${product.views} views · ${product.adds} adds`
            : product.reason === 'looked, not added'
                ? `${product.name} · ${product.views} views · never added`
                : `${product.name} · added ${product.adds} times · not bought`;

    return (
        <section className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Today</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-gray-900">Drop-off and paid orders</h2>
            <p className="mt-3 text-sm text-gray-700">
                <span className="font-black text-gray-900">{readout.visits.toLocaleString()}</span> page visits today.
                {' '}<span className="font-black text-gray-900">{readout.paidOrders.toLocaleString()}</span> paid orders today.
                {' '}<span className="font-black text-gray-900">{readout.checkoutLeft.toLocaleString()}</span> signed-in checkouts did not place an order.
            </p>
            <p className="mt-1 text-xs text-gray-400">Visits and paid orders are today. Checkout sessions are the latest visit per account, so an older checkout still counts. Product counts are lifetime.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Page losing people</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{pageLine}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Product losing people</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{productLine}</p>
                </div>
            </div>
            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Next action</p>
                <p className="mt-1 font-black text-gray-900">{readout.action ? ACTION_LABEL[readout.action] : 'Nothing to act on'}</p>
                <p className="mt-1 text-sm text-emerald-950/80">{readout.detail}</p>
                {readout.href ? (
                    <Link href={readout.href} className="mt-3 inline-block text-xs font-black uppercase tracking-widest text-melagri-primary">
                        {readout.linkLabel}
                    </Link>
                ) : null}
            </div>
        </section>
    );
}
