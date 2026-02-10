"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    name: string;
    label?: string;
}

export function Input({ name, label, className, ...props }: InputProps) {
    const { register, formState: { errors } } = useFormContext();
    const error = errors[name]?.message as string | undefined;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                id={name}
                {...register(name)}
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
