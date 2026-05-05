"use client";
import React from 'react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** 'danger' = red confirm button, 'primary' = green */
    tone?: 'danger' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
    busy?: boolean;
}

/**
 * Small reusable confirmation modal — replaces native window.confirm() so admin
 * actions stay on-brand and consistent. Keep it dumb on purpose; the parent
 * owns the open/close state and the action.
 */
export default function ConfirmDialog({
    open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
    tone = 'danger', onConfirm, onCancel, busy = false,
}: ConfirmDialogProps) {
    if (!open) return null;
    const confirmClass = tone === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-700'
        : 'bg-melagri-primary text-white hover:bg-melagri-secondary';
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8">
                <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 ${confirmClass}`}
                    >
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
