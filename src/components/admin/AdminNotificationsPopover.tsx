"use client";
import React, { useRef, useEffect } from 'react';
import { useOrders } from '@/context/OrderContext';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface AdminNotificationsPopoverProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminNotificationsPopover({ isOpen, onClose }: AdminNotificationsPopoverProps) {
    const { notifications, markNotificationRead, unreadNotificationsCount } = useOrders();
    const popoverRef = useRef<HTMLDivElement>(null);

    // Handle clicks outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={popoverRef}
            className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-300"
        >
            {/* Header */}
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Notifications</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                        {unreadNotificationsCount} Unread Alerts
                    </p>
                </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.slice(0, 10).map((notif) => (
                            <div
                                key={notif.id}
                                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative ${!notif.read ? 'bg-melagri-primary/5' : ''}`}
                                onClick={() => {
                                    markNotificationRead(notif.id);
                                    // Extract order ID if present in message (e.g. #ABCDE)
                                    const orderMatch = notif.message.match(/#([a-zA-Z0-9]{5,})/);
                                    if (orderMatch && orderMatch[1]) {
                                        // Since we don't have the full ID here easily, 
                                        // we might just go to orders list or try to find it.
                                        // For now, let's keep it simple.
                                    }
                                }}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.type === 'system' ? 'bg-blue-100 text-blue-600' :
                                            notif.type === 'order' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        {notif.type === 'system' ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm leading-snug ${!notif.read ? 'font-black text-gray-900' : 'text-gray-600'}`}>
                                            {notif.message}
                                        </p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">
                                            {formatDistanceToNow(new Date(notif.date), { addSuffix: true })}
                                        </p>
                                    </div>
                                    {!notif.read && (
                                        <div className="w-2 h-2 bg-melagri-primary rounded-full mt-2"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-50 bg-gray-50/50 text-center">
                <Link
                    href="/dashboard/admin/messages"
                    onClick={onClose}
                    className="text-[10px] font-black text-melagri-primary uppercase tracking-[.2em] hover:text-melagri-secondary transition-colors"
                >
                    View All Activity
                </Link>
            </div>
        </div>
    );
}
