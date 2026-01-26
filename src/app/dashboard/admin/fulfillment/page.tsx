"use client";
import React, { useState, useEffect } from 'react';
import { useOrders } from '@/context/OrderContext';
import { useProducts } from '@/context/ProductContext';
import { Order } from '@/types';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function FulfillmentPage() {
    const { orders, updateOrderStatus } = useOrders();
    const { products } = useProducts();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Only orders that are Paid and not yet Delivered/Cancelled
    const actionableOrders = orders.filter(o =>
        o.paymentStatus === 'Paid' &&
        ['Processing', 'Shipped'].includes(o.status)
    );

    const stats = {
        pending: orders.filter(o => o.status === 'Processing' && o.paymentStatus === 'Paid').length,
        shipped: orders.filter(o => o.status === 'Shipped').length,
        outOfStock: products.filter(p => p.stockQuantity === 0).length,
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2m16 0h-2m-2 0H8m-2 0H4" /></svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">To Fulfill</p>
                        <p className="text-2xl font-black text-gray-900">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">In Transit</p>
                        <p className="text-2xl font-black text-gray-900">{stats.shipped}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Stock Alerts</p>
                        <p className="text-2xl font-black text-gray-900">{stats.outOfStock}</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List of Orders */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">Paid Orders Waiting</h2>
                    {actionableOrders.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500">
                            Clear for now! No pending fulfillment.
                        </div>
                    ) : (
                        actionableOrders.map(order => (
                            <div
                                key={order.id}
                                className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer ${selectedOrder?.id === order.id ? 'border-melagri-primary ring-1 ring-melagri-primary shadow-md' : 'border-gray-100 hover:border-gray-200 shadow-sm'}`}
                                onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</p>
                                        <p className="text-xs text-gray-500">{new Date(order.date).toLocaleString()}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${order.status === 'Processing' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {order.shippingAddress.county}, {order.shippingAddress.details}
                                </div>
                                <div className="mt-4 flex justify-between items-center bg-gray-50 p-3 rounded-lg overflow-x-auto">
                                    <div className="flex -space-x-2">
                                        {order.items.slice(0, 3).map((item, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold overflow-hidden shadow-sm">
                                                {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : item.name[0]}
                                            </div>
                                        ))}
                                        {order.items.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold">+ {order.items.length - 3}</div>
                                        )}
                                    </div>
                                    <p className="text-sm font-black text-gray-900">KES {order.total.toLocaleString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Details / Actions Sidebar */}
                <div className="lg:col-span-1">
                    {selectedOrder ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24 space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-4">Fulfillment Actions</h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                    <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Quick Move</p>
                                    <div className="flex flex-col gap-2">
                                        {selectedOrder.status === 'Processing' && (
                                            <button
                                                onClick={() => updateOrderStatus(selectedOrder.id, 'Shipped')}
                                                className="w-full py-3 bg-melagri-primary text-white rounded-xl font-bold hover:bg-melagri-secondary transition-all shadow-md active:scale-95"
                                            >
                                                Mark as Shipped
                                            </button>
                                        )}
                                        {selectedOrder.status === 'Shipped' && (
                                            <button
                                                onClick={() => updateOrderStatus(selectedOrder.id, 'Delivered')}
                                                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md active:scale-95"
                                            >
                                                Confirm Delivered
                                            </button>
                                        )}
                                        <button
                                            onClick={() => updateOrderStatus(selectedOrder.id, 'Cancelled')}
                                            className="w-full py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            Cancel & Restock
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Print Documents</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Link
                                            href={`/dashboard/admin/orders/${selectedOrder.id}/delivery-note`}
                                            className="flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            Packing Slip
                                        </Link>
                                        <Link
                                            href={`/dashboard/admin/orders/${selectedOrder.id}/invoice`}
                                            className="flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Invoice
                                        </Link>
                                    </div>
                                </div>

                                <InternalNotes orderId={selectedOrder.id} initialNote={selectedOrder.internalNotes || ''} history={selectedOrder.internalHistory || []} />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 h-[400px] rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 p-8 text-center">
                            Select an order to view fulfillment actions
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InternalNotes({ orderId, initialNote, history }: { orderId: string, initialNote: string, history: any[] }) {
    const { addInternalNote } = useOrders();
    const [note, setNote] = useState(initialNote);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setNote(initialNote);
    }, [initialNote]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await addInternalNote(orderId, note);
            toast.success("Internal note saved");
        } catch (error) {
            toast.error("Failed to save note");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-3 pt-4 border-t border-gray-50">
            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Internal Notes</p>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs rounded-xl border-gray-200 focus:ring-melagri-primary/20 p-3 min-h-[80px]"
                placeholder="Add logistics or status notes here..."
            />
            <button
                disabled={isSaving || note === initialNote}
                onClick={handleSave}
                className="w-full py-2 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
            >
                {isSaving ? 'Saving...' : 'Save Note'}
            </button>
            {history.length > 0 && (
                <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                    {history.slice().reverse().map((h, i) => (
                        <div key={i} className="p-2 bg-gray-50/50 rounded-lg text-[9px] border border-gray-50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-gray-900">{h.author}</span>
                                <span className="text-gray-400">{new Date(h.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-600 italic">"{h.note}"</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
