"use client";

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { get, useFormContext } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';
import type { GeocodeSuggestion } from '@/lib/geocode';

interface AddressSearchFieldProps {
    name: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    helperText?: string;
    onPlaceSelect?: (place: GeocodeSuggestion) => void;
}

export default function AddressSearchField({
    name,
    label,
    placeholder,
    required,
    helperText,
    onPlaceSelect,
}: AddressSearchFieldProps) {
    const { register, setValue, watch, formState: { errors } } = useFormContext();
    const error = get(errors, name)?.message as string | undefined;
    const value = (watch(name) as string) || '';
    const listId = useId();
    const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<GeocodeSuggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const skipSearchRef = useRef(false);

    const { onChange: registerOnChange, onBlur: registerOnBlur, name: regName, ref } = register(name);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        if (skipSearchRef.current) {
            skipSearchRef.current = false;
            return;
        }

        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(trimmed)}`, {
                    signal: controller.signal,
                });
                const data = await response.json();
                if (data.success) {
                    setResults(data.results || []);
                    setOpen(true);
                    setActiveIndex(-1);
                } else {
                    setResults([]);
                }
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('Address search failed', error);
                    setResults([]);
                }
            } finally {
                setLoading(false);
            }
        }, 350);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    const applyPlace = useCallback((place: GeocodeSuggestion) => {
        skipSearchRef.current = true;
        setQuery(place.town || place.label.split(',')[0] || place.label);
        setValue(name, place.town || place.label.split(',')[0] || place.label, { shouldValidate: true, shouldDirty: true });
        setResults([]);
        setOpen(false);
        setActiveIndex(-1);
        onPlaceSelect?.(place);
    }, [name, onPlaceSelect, setValue]);

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        registerOnBlur(event);
        blurTimer.current = setTimeout(() => setOpen(false), 150);
    };

    const handleFocus = () => {
        if (blurTimer.current) clearTimeout(blurTimer.current);
        if (results.length > 0) setOpen(true);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open || results.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % results.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
        } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault();
            applyPlace(results[activeIndex]);
        } else if (event.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="relative w-full">
            {label && (
                <label htmlFor={regName} className="mb-1.5 block text-sm font-semibold text-gray-900">
                    {label}{required ? ' *' : ''}
                </label>
            )}
            <div className="relative">
                <input
                    id={regName}
                    name={regName}
                    ref={ref}
                    value={query}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
                    placeholder={placeholder}
                    required={required}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onChange={(event) => {
                        const next = event.target.value;
                        setQuery(next);
                        setValue(name, next, { shouldDirty: true });
                        registerOnChange(event);
                        setOpen(true);
                    }}
                    className={twMerge(
                        'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-shadow focus:border-green-600 focus:ring-4 focus:ring-green-600/10',
                        error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : '',
                    )}
                />
                {loading && (
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                    </div>
                )}
            </div>
            {helperText && !error && (
                <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
            )}
            {error && (
                <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
            )}

            {open && results.length > 0 && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-100 bg-white py-2 shadow-xl shadow-black/10"
                >
                    {results.map((place, index) => (
                        <li key={place.id} role="option" aria-selected={index === activeIndex} id={`${listId}-option-${index}`}>
                            <button
                                type="button"
                                className={twMerge(
                                    'flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-green-50',
                                    index === activeIndex ? 'bg-green-50' : '',
                                )}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => applyPlace(place)}
                            >
                                <span className="text-sm font-bold text-gray-900">{place.town || place.label.split(',')[0]}</span>
                                <span className="text-xs text-gray-500 line-clamp-2">{place.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
