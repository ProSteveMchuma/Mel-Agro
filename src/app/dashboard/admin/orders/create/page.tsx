"use client";

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { useProducts } from '@/context/ProductContext';
import { useShippingZones } from '@/hooks/useShippingZones';
import { getDeliveryCost, KENYAN_COUNTIES } from '@/lib/delivery';
import { PICKUP_STORE } from '@/lib/pickup';
import { normalizeKenyanPhone } from '@/lib/account-upgrade';
import {
    catalogueUnitPrice,
    catalogueUnitsAvailable,
    customerCreateBlock,
} from '@/lib/whatsapp-order';
import type { Product } from '@/types';

type StaffCustomer = {
    id: string;
    name: string;
    email: string;
    phone: string;
    county: string;
    loyaltyPoints: number;
    status: string;
    savedAddresses: Array<{ id?: string; label?: string; county?: string; city?: string; details?: string; isPrimary?: boolean }>;
};

type Line = { key: string; productId: string; variantId?: string; quantity: number };

async function staffFetch(url: string, body?: unknown) {
    const token = await getAuth().currentUser?.getIdToken();
    const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json().catch(() => ({}));
    return { response, result };
}

function lineLabel(product: Product | undefined, variantId?: string) {
    const variant = product?.variants?.find((entry) => entry.id === variantId);
    return variant ? `${product?.name} · ${variant.name}` : (product?.name || 'Product');
}

export default function CreateOrderPage() {
    const { products } = useProducts();
    const { zones } = useShippingZones();
    const router = useRouter();
    const requestId = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wa${Date.now()}`);

    const [phoneInput, setPhoneInput] = useState('');
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [matches, setMatches] = useState<StaffCustomer[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [newName, setNewName] = useState('');
    const [productQuery, setProductQuery] = useState('');
    const [packChoice, setPackChoice] = useState<Record<string, string>>({});
    const [lines, setLines] = useState<Line[]>([]);
    const [fulfillment, setFulfillment] = useState<'standard' | 'pickup'>('standard');
    const [county, setCounty] = useState('');
    const [town, setTown] = useState('');
    const [address, setAddress] = useState('');
    const [promptPhone, setPromptPhone] = useState('');
    const [whatsappPhone, setWhatsappPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const selected = matches.find((customer) => customer.id === selectedId) || null;
    const suspendedOnly = customerCreateBlock(matches) === 'suspended';
    const usableMatches = matches.filter((customer) => customer.status !== 'suspended');

    const catalogue = useMemo(() => {
        const term = productQuery.trim().toLowerCase();
        const list = products.filter((product) => !term || product.name.toLowerCase().includes(term) || String(product.productCode || '').toLowerCase().includes(term));
        return list.slice(0, 20);
    }, [productQuery, products]);

    const subtotal = lines.reduce((sum, line) => {
        const product = products.find((entry) => String(entry.id) === line.productId);
        if (!product) return sum;
        return sum + catalogueUnitPrice(product, line.variantId) * line.quantity;
    }, 0);
    const shipping = fulfillment === 'pickup'
        ? { cost: 0, zoneName: 'Machakos collection', etaText: PICKUP_STORE.etaText }
        : county
            ? getDeliveryCost(county, subtotal, zones)
            : { cost: 0, zoneName: 'Delivery', etaText: 'Select a county' };
    const total = subtotal + shipping.cost;

    function applyCustomer(customer: StaffCustomer) {
        setSelectedId(customer.id);
        setNewName(customer.name || '');
        const saved = customer.savedAddresses.find((entry) => entry.isPrimary) || customer.savedAddresses[0];
        if (saved?.county && KENYAN_COUNTIES.includes(saved.county)) {
            setCounty(saved.county);
            setTown(saved.city || '');
            setAddress(saved.details || '');
            setFulfillment('standard');
        } else if (customer.county && KENYAN_COUNTIES.includes(customer.county)) {
            setCounty(customer.county);
        }
        setPromptPhone(customer.phone || phoneInput);
    }

    async function searchPhone(event?: React.FormEvent) {
        event?.preventDefault();
        setFormError('');
        setSearched(false);
        setMatches([]);
        setSelectedId('');
        try {
            normalizeKenyanPhone(phoneInput);
        } catch {
            setFormError('Enter a valid Kenyan phone number (e.g. 0712 345 678).');
            return;
        }
        setSearching(true);
        try {
            const { response, result } = await staffFetch(`/api/admin/customers/by-phone?phone=${encodeURIComponent(phoneInput.trim())}`);
            if (!response.ok) throw new Error(result.message || 'Could not search customers');
            const customers = (result.customers || []) as StaffCustomer[];
            setMatches(customers);
            setSearched(true);
            setWhatsappPhone(phoneInput.trim());
            const open = customers.filter((customer) => customer.status !== 'suspended');
            if (open.length === 1) applyCustomer(open[0]);
            else setPromptPhone(phoneInput.trim());
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Could not search customers');
        } finally {
            setSearching(false);
        }
    }

    function addProduct(product: Product) {
        setFormError('');
        const variants = product.variants || [];
        const variantId = variants.length ? packChoice[String(product.id)] : undefined;
        if (variants.length && !variantId) {
            setFormError(`Choose a pack for ${product.name}.`);
            return;
        }
        const available = catalogueUnitsAvailable(product, variantId);
        if (available < 1) {
            setFormError(`${product.name} is out of stock.`);
            return;
        }
        const key = `${product.id}:${variantId || ''}`;
        setLines((current) => {
            const existing = current.find((line) => line.key === key);
            if (existing) {
                if (existing.quantity >= available) return current;
                return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line);
            }
            return [...current, { key, productId: String(product.id), variantId, quantity: 1 }];
        });
    }

    function setQuantity(key: string, quantity: number) {
        const line = lines.find((entry) => entry.key === key);
        const product = products.find((entry) => String(entry.id) === line?.productId);
        const available = product ? catalogueUnitsAvailable(product, line?.variantId) : 0;
        if (!Number.isFinite(quantity) || quantity < 1) return;
        if (quantity > available) {
            setFormError(`Only ${available} left.`);
            return;
        }
        setFormError('');
        setLines((current) => current.map((entry) => entry.key === key ? { ...entry, quantity } : entry));
    }

    async function ensureCustomer(): Promise<StaffCustomer> {
        if (selected) {
            if (selected.status === 'suspended') throw new Error('This account is suspended.');
            return selected;
        }
        if (usableMatches.length > 1) throw new Error('Choose which customer this WhatsApp number belongs to.');
        if (suspendedOnly) throw new Error('This account is suspended.');
        if (!searched) throw new Error('Search the WhatsApp number first.');
        const name = newName.trim();
        if (name.length < 2) throw new Error('Enter the customer name from WhatsApp.');
        const { response, result } = await staffFetch('/api/admin/customers/by-phone', { phone: phoneInput.trim(), name });
        if (!response.ok) throw new Error(result.message || 'Could not create the customer');
        const customers = (result.customers || []) as StaffCustomer[];
        const created = customers.find((customer) => customer.status !== 'suspended') || customers[0];
        if (!created) throw new Error('Could not create the customer');
        if (created.status === 'suspended') throw new Error('This account is suspended.');
        setMatches(customers);
        setSelectedId(created.id);
        return created;
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (submitting) return;
        setFormError('');
        if (lines.length === 0) {
            setFormError('Add at least one product.');
            return;
        }
        let mpesaPhone = '';
        let chatPhone = '';
        try {
            mpesaPhone = normalizeKenyanPhone(promptPhone || phoneInput);
            chatPhone = normalizeKenyanPhone(whatsappPhone || phoneInput);
        } catch {
            setFormError('Enter a valid Kenyan phone number for the M-Pesa prompt.');
            return;
        }
        if (fulfillment === 'standard') {
            if (!KENYAN_COUNTIES.includes(county)) {
                setFormError('Select a county.');
                return;
            }
            if (town.trim().length < 2 || address.trim().length < 5) {
                setFormError('Enter the town and delivery address.');
                return;
            }
        }

        setSubmitting(true);
        const notice = toast.loading('Creating order…');
        try {
            const customer = await ensureCustomer();
            const { response, result } = await staffFetch('/api/orders/create', {
                orderChannel: 'whatsapp',
                customerId: customer.id,
                clientRequestId: requestId.current,
                whatsappPhone: chatPhone,
                items: lines.map((line) => ({
                    id: line.productId,
                    quantity: line.quantity,
                    ...(line.variantId ? { variantId: line.variantId } : {}),
                })),
                shipping: {
                    fullName: (customer.name || newName).trim(),
                    email: customer.email || '',
                    phone: mpesaPhone,
                    ...(fulfillment === 'standard' ? { county, town: town.trim(), address: address.trim() } : {}),
                },
                shippingMethod: fulfillment,
                paymentMethod: 'mpesa',
                redeemPoints: false,
            });
            if (!response.ok || !result.order?.id) {
                throw new Error(result.message || 'Could not create the order');
            }
            toast.success('Order created', { id: notice });
            router.push(`/dashboard/admin/orders/${result.order.id}?prompt=1`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not create the order';
            setFormError(message);
            toast.error(message, { id: notice });
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-green-700">WhatsApp order</p>
                <h1 className="text-2xl font-bold text-gray-900">Create order</h1>
                <p className="mt-1 text-sm text-gray-500">Start from the customer on WhatsApp, then send an M-Pesa prompt.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-bold text-lg">1. Customer</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="tel"
                            inputMode="tel"
                            value={phoneInput}
                            onChange={(event) => setPhoneInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void searchPhone();
                                }
                            }}
                            placeholder="WhatsApp number, 07XX XXX XXX"
                            className="min-h-11 flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                            aria-label="WhatsApp phone number"
                        />
                        <button type="button" onClick={() => void searchPhone()} disabled={searching} className="min-h-11 px-5 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50">
                            {searching ? 'Searching…' : 'Find customer'}
                        </button>
                    </div>

                    {suspendedOnly ? (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">This account is suspended.</p>
                    ) : null}

                    {usableMatches.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700">{usableMatches.length > 1 ? 'Existing customers — choose one' : 'Existing customer'}</p>
                            {usableMatches.map((customer) => (
                                <label key={customer.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selectedId === customer.id ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                                    <input type="radio" name="customer" checked={selectedId === customer.id} onChange={() => applyCustomer(customer)} className="mt-1" />
                                    <span>
                                        <span className="block font-semibold text-gray-900">{customer.name || 'Unnamed customer'}</span>
                                        <span className="block text-sm text-gray-600">{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</span>
                                        <span className="block text-xs text-gray-500">{customer.county || 'No county'} · {customer.loyaltyPoints.toLocaleString()} loyalty points (not applied)</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    ) : null}

                    {searched && usableMatches.length === 0 && !suspendedOnly ? (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700">New customer</p>
                            <input
                                value={newName}
                                onChange={(event) => setNewName(event.target.value)}
                                placeholder="Name on WhatsApp"
                                aria-label="Customer name"
                                className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                            />
                            <p className="text-xs text-gray-500">No account for this number. We will create one when you place the order. Email stays blank.</p>
                        </div>
                    ) : null}
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-bold text-lg">2. Products</h2>
                    <input
                        value={productQuery}
                        onChange={(event) => setProductQuery(event.target.value)}
                        placeholder="Search name or code"
                        aria-label="Search products"
                        className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                    />
                    <div className="space-y-2">
                        {catalogue.map((product) => {
                            const variants = product.variants || [];
                            const chosen = packChoice[String(product.id)] || '';
                            const previewId = variants.length ? chosen : undefined;
                            const available = variants.length && !chosen ? null : catalogueUnitsAvailable(product, previewId);
                            const price = variants.length && !chosen ? product.price : catalogueUnitPrice(product, previewId);
                            return (
                                <div key={product.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-gray-500">KES {price.toLocaleString()}{available != null && available <= 5 ? ` · only ${available} left` : ''}</div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {variants.length > 0 ? (
                                            <select
                                                aria-label={`Pack for ${product.name}`}
                                                value={chosen}
                                                onChange={(event) => setPackChoice((current) => ({ ...current, [String(product.id)]: event.target.value }))}
                                                className="min-h-10 rounded-lg border border-gray-200 px-2 text-sm"
                                            >
                                                <option value="">Pack</option>
                                                {variants.map((variant) => (
                                                    <option key={variant.id} value={variant.id}>
                                                        {variant.name} · KES {(variant.price ?? product.price).toLocaleString()} · {variant.stockQuantity ?? 0} in stock
                                                    </option>
                                                ))}
                                            </select>
                                        ) : null}
                                        <button type="button" onClick={() => addProduct(product)} className="min-h-10 px-3 text-sm bg-gray-100 hover:bg-green-700 hover:text-white rounded-lg">
                                            Add
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {catalogue.length === 0 ? <p className="text-sm text-gray-500">No products match that search.</p> : null}
                    </div>

                    {lines.length > 0 ? (
                        <div className="space-y-2 border-t border-gray-100 pt-4">
                            {lines.map((line) => {
                                const product = products.find((entry) => String(entry.id) === line.productId);
                                const available = product ? catalogueUnitsAvailable(product, line.variantId) : 0;
                                const unit = product ? catalogueUnitPrice(product, line.variantId) : 0;
                                return (
                                    <div key={line.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                                        <div>
                                            <div className="font-medium">{lineLabel(product, line.variantId)}</div>
                                            <div className="text-xs text-gray-500">KES {unit.toLocaleString()} each{available <= 5 ? ` · only ${available} left` : ''}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min={1}
                                                max={available}
                                                value={line.quantity}
                                                aria-label={`Quantity for ${lineLabel(product, line.variantId)}`}
                                                onChange={(event) => setQuantity(line.key, parseInt(event.target.value, 10))}
                                                className="w-16 px-2 py-1 rounded border border-gray-200"
                                            />
                                            <div className="w-28 text-right font-bold">KES {(unit * line.quantity).toLocaleString()}</div>
                                            <button type="button" onClick={() => setLines((current) => current.filter((entry) => entry.key !== line.key))} className="text-red-600" aria-label="Remove line">&times;</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-bold text-lg">3. Delivery</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button type="button" onClick={() => setFulfillment('standard')} className={`rounded-xl border p-4 text-left ${fulfillment === 'standard' ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                            <span className="block font-semibold">County delivery</span>
                            <span className="block text-sm text-gray-600">{county ? `${shipping.zoneName} · KES ${shipping.cost.toLocaleString()}` : 'Zone price, free over KES 10,000'}</span>
                        </button>
                        <button type="button" onClick={() => setFulfillment('pickup')} className={`rounded-xl border p-4 text-left ${fulfillment === 'pickup' ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                            <span className="block font-semibold">Machakos collection · KES 0</span>
                            <span className="block text-sm text-gray-600">{PICKUP_STORE.etaText}</span>
                        </button>
                    </div>
                    {fulfillment === 'standard' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className="block text-sm">
                                <span className="font-medium text-gray-700">County</span>
                                <select value={county} onChange={(event) => setCounty(event.target.value)} className="mt-1 w-full min-h-11 px-3 rounded-xl border border-gray-200">
                                    <option value="">Select county</option>
                                    {KENYAN_COUNTIES.map((name) => <option key={name}>{name}</option>)}
                                </select>
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-gray-700">Town</span>
                                <input value={town} onChange={(event) => setTown(event.target.value)} className="mt-1 w-full min-h-11 px-3 rounded-xl border border-gray-200" />
                            </label>
                            <label className="block text-sm">
                                <span className="font-medium text-gray-700">Address</span>
                                <input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full min-h-11 px-3 rounded-xl border border-gray-200" />
                            </label>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600">{PICKUP_STORE.name}. {PICKUP_STORE.label}.</p>
                    )}
                    {fulfillment === 'standard' && county ? (
                        <p className="text-sm text-gray-700">{shipping.zoneName} · KES {shipping.cost.toLocaleString()} · {shipping.etaText}</p>
                    ) : null}
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h2 className="font-bold text-lg">4. Payment prompt</h2>
                    <label className="block text-sm">
                        <span className="font-medium text-gray-700">M-Pesa number</span>
                        <input
                            type="tel"
                            value={promptPhone}
                            onChange={(event) => setPromptPhone(event.target.value)}
                            placeholder="Number that should receive the PIN prompt"
                            className="mt-1 w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200"
                        />
                    </label>
                    <p className="text-xs text-gray-500">Defaults to the WhatsApp number. Change it only if the farmer wants the prompt on another line. The pay link goes by SMS to that number.</p>
                    <div className="text-right space-y-1">
                        <div className="text-gray-600">Subtotal: KES {subtotal.toLocaleString()}</div>
                        <div className="text-gray-600">{fulfillment === 'pickup' ? 'Machakos collection' : shipping.zoneName}: KES {shipping.cost.toLocaleString()}</div>
                        <div className="text-xl font-bold text-gray-900">Total: KES {total.toLocaleString()}</div>
                    </div>
                </section>

                {formError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{formError}</p> : null}

                <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => router.push('/dashboard/admin/orders')} className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100">
                        Cancel
                    </button>
                    <button type="submit" disabled={submitting || lines.length === 0 || suspendedOnly} className="btn-primary px-8 py-3 rounded-xl font-medium disabled:opacity-50">
                        {submitting ? 'Creating order…' : 'Create order and prompt for payment'}
                    </button>
                </div>
            </form>
        </div>
    );
}
