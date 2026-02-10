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

export function Input({ name, label, className, format, ...props }: InputProps) {
    const { register, formState: { errors }, setValue } = useFormContext();
    const error = errors[name]?.message as string | undefined;

    const { onChange, onBlur, name: regName, ref } = register(name);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;

        if (format === 'uppercase') {
            value = value.toUpperCase();
            e.target.value = value;
            setValue(name, value);
        }

        onChange(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (format === 'phone') {
            let value = e.target.value.replace(/\s+/g, '');
            if (value.startsWith('0')) value = '+254' + value.substring(1);
            if (value.startsWith('7') || value.startsWith('1')) value = '+254' + value;
            if (value && !value.startsWith('+')) value = '+254' + value;

            e.target.value = value;
            setValue(name, value);
        }
        onBlur(e);
    }

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
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
                    className
                )}
            />
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
