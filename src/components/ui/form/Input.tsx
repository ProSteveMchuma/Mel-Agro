"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    name: string;
    label?: string;
    format?: 'phone' | 'uppercase';
}

// Convert raw user input into a Kenyan phone number visualised as "+254 7XX XXX XXX".
// Accepts any of: "0712...", "254712...", "+254712...", "712...".
function formatKenyanPhoneLive(raw: string): string {
    const digits = (raw || '').replace(/\D/g, '');
    let core = digits;
    if (core.startsWith('254')) core = core.slice(3);
    if (core.startsWith('0')) core = core.slice(1);
    if (!core) return '';
    const trimmed = core.slice(0, 9);
    if (trimmed.length <= 3) return `+254 ${trimmed}`;
    if (trimmed.length <= 6) return `+254 ${trimmed.slice(0, 3)} ${trimmed.slice(3)}`;
    return `+254 ${trimmed.slice(0, 3)} ${trimmed.slice(3, 6)} ${trimmed.slice(6, 9)}`;
}

function isValidKenyanPhone(formatted: string): boolean {
    const digits = (formatted || '').replace(/\D/g, '');
    if (!digits.startsWith('254')) return false;
    const subscriber = digits.slice(3);
    return subscriber.length === 9 && (subscriber.startsWith('7') || subscriber.startsWith('1'));
}

export function Input({ name, label, className, format, ...props }: InputProps) {
    const { register, formState: { errors }, setValue, watch } = useFormContext();
    const error = errors[name]?.message as string | undefined;

    const { onChange, onBlur, name: regName, ref } = register(name);
    const currentValue = watch(name);

    const isPhone = format === 'phone';
    const phoneIsValid = isPhone ? isValidKenyanPhone(currentValue || '') : false;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;

        if (format === 'uppercase') {
            value = value.toUpperCase();
        } else if (isPhone) {
            value = formatKenyanPhoneLive(value);
        }

        e.target.value = value;
        if (format === 'uppercase' || isPhone) setValue(name, value, { shouldValidate: true });
        onChange(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (isPhone) {
            const formatted = formatKenyanPhoneLive(e.target.value);
            e.target.value = formatted;
            setValue(name, formatted, { shouldValidate: true });
        }
        onBlur(e);
    };

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={name}
                    name={regName}
                    ref={ref}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    {...props}
                    className={twMerge(
                        "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                        error
                            ? "border-red-500 focus:ring-red-200"
                            : "border-gray-200 focus:ring-melagri-primary/50",
                        isPhone && phoneIsValid ? "pr-10" : "",
                        className
                    )}
                />
                {isPhone && phoneIsValid && !error && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" title="Valid Kenyan number">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </span>
                )}
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}
