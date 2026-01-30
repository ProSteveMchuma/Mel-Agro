"use client";

import React from 'react';

interface LogoProps {
    className?: string;
    iconOnly?: boolean;
    light?: boolean;
}

export default function Logo({ className = "", iconOnly = false, light = false }: LogoProps) {
    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            {/* Logo Icon */}
            <div className={`relative flex-shrink-0 w-10 h-10 ${light ? 'bg-white' : 'bg-green-600'} rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300 group`}>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-6 h-6 ${light ? 'text-green-600' : 'text-white'}`}
                >
                    <path
                        d="M12 21C12 21 12 14 17 10C19 8.4 21 8 21 5C21 3 19 3 19 3C19 3 12 3 12 10C12 3 5 3 5 3C5 3 3 3 3 5C3 8 5 8.4 7 10C12 14 12 21 12 21Z"
                        fill="currentColor"
                    />
                    <path
                        d="M12 21V10"
                        stroke={light ? "#16a34a" : "white"}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
                {/* Decorative dots */}
                <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${light ? 'bg-green-400' : 'bg-orange-400'} animate-pulse`} />
            </div>

            {!iconOnly && (
                <div className="flex flex-col leading-none">
                    <span className={`text-2xl font-black tracking-tighter ${light ? 'text-white' : 'text-gray-900'} uppercase`}>
                        Mel<span className={`${light ? 'text-green-200' : 'text-green-600'}`}>-Agri</span>
                    </span>
                    <span className={`text-[8px] font-bold tracking-[0.3em] uppercase ${light ? 'text-white/60' : 'text-gray-400'} -mt-0.5`}>
                        Premium Agriculture
                    </span>
                </div>
            )}
        </div>
    );
}
