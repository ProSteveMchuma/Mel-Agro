'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { PublicOrder } from '@/lib/order-access-client';
import { SUPPORT_PHONE_DISPLAY, whatsAppUrl } from '@/lib/site';

export function statusTone(status: string) {
    if (status === 'Delivered' || status === 'Paid' || status === 'Approved') {
        return 'bg-green-100 text-green-800';
    }
    if (status === 'Shipped' || status === 'Processing' || status === 'Requested') {
        return 'bg-amber-100 text-amber-900';
    }
    if (status === 'Cancelled' || status === 'Rejected') {
        return 'bg-red-100 text-red-800';
    }
    return 'bg-slate-100 text-slate-700';
}

export function OrderAccessFrame({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-white to-slate-50 flex flex-col">
            <Header />
            <main className="flex-1 container-custom py-8 md:py-12">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-6">
                        <p className="text-xs font-black uppercase tracking-widest text-melagri-primary mb-2">Mel-Agri order</p>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
                        {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
                    </div>
                    {children}
                    <p className="mt-8 text-center text-xs text-slate-500">
                        Need help? Call <a className="font-semibold text-melagri-primary" href={`tel:${SUPPORT_PHONE_DISPLAY.replace(/\s/g, '')}`}>{SUPPORT_PHONE_DISPLAY}</a>
                        {' '}or{' '}
                        <a className="font-semibold text-melagri-primary" href={whatsAppUrl('Habari Mel-Agri, I need help with my order.')} target="_blank" rel="noreferrer">
                            WhatsApp us
                        </a>.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export function OrderSummaryCard({
    order,
    accessToken,
    highlight,
}: {
    order: PublicOrder;
    accessToken?: string;
    highlight?: 'pay' | 'return' | 'view';
}) {
    const tokenQuery = accessToken ? `?t=${encodeURIComponent(accessToken)}` : '';
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order</p>
                    <p className="text-lg font-black text-slate-900">#{order.shortId}</p>
                    <p className="text-sm text-slate-600 mt-1">Hi {order.userName}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusTone(order.status)}`}>
                        {order.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusTone(order.paymentStatus)}`}>
                        {order.paymentStatus}
                    </span>
                </div>
            </div>

            <ul className="divide-y divide-slate-100 mb-4">
                {order.items.map((item) => (
                    <li key={`${item.id}-${item.name}`} className="py-3 flex justify-between gap-4 text-sm">
                        <span className="text-slate-800">
                            {item.name} <span className="text-slate-500">× {item.quantity}</span>
                        </span>
                        <span className="font-semibold text-slate-900 whitespace-nowrap">
                            KES {(item.price * item.quantity).toLocaleString()}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-600">Total</span>
                <span className="text-xl font-black text-melagri-primary">KES {order.total.toLocaleString()}</span>
            </div>

            {order.shippingAddress ? (
                <p className="mt-4 text-xs text-slate-500">
                    {order.shippingMethod || 'Delivery'} · {order.shippingAddress.county}
                    {order.shippingAddress.details ? ` — ${order.shippingAddress.details}` : ''}
                </p>
            ) : null}

            {order.returnStatus ? (
                <p className="mt-4 text-sm font-bold text-amber-800">
                    Return: {order.returnStatus}
                    {order.returnReason ? ` — ${order.returnReason}` : ''}
                </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
                {highlight !== 'view' ? (
                    <Link
                        href={`/orders/${order.id}${tokenQuery}`}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        Track order
                    </Link>
                ) : null}
                {order.paymentStatus !== 'Paid' && order.status !== 'Cancelled' && highlight !== 'pay' ? (
                    <Link
                        href={`/orders/${order.id}/pay${tokenQuery}`}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-melagri-primary text-white hover:bg-melagri-secondary"
                    >
                        Pay now
                    </Link>
                ) : null}
                {order.returnEligible && highlight !== 'return' ? (
                    <Link
                        href={`/orders/${order.id}/return${tokenQuery}`}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold border border-amber-300 text-amber-950 hover:bg-amber-50"
                    >
                        Request return
                    </Link>
                ) : null}
            </div>
        </section>
    );
}

export function OrderAccessError({ message, signInHref }: { message: string; signInHref?: string }) {
    return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-900">{message}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
                {signInHref ? (
                    <Link href={signInHref} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-melagri-primary text-white">
                        Sign in
                    </Link>
                ) : null}
                <Link href="/" className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white">
                    Back to shop
                </Link>
            </div>
        </div>
    );
}

export function OrderAccessLoading() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-melagri-primary" />
        </div>
    );
}
