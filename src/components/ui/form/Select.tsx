"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    name: string;
    label?: string;
    options: { value: string; label: string }[];
}

export function Select({ name, label, options, className, ...props }: SelectProps) {
    const { register, formState: { errors } } = useFormContext();
    const error = errors[name]?.message as string | undefined;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={name}
                    {...register(name)}
                    {...props}
                    className={twMerge(
                        "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all appearance-none bg-white",
                        error
                            ? "border-red-500 focus:ring-red-200"
                            : "border-gray-200 focus:ring-melagri-primary/50",
                        className
                    )}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
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
