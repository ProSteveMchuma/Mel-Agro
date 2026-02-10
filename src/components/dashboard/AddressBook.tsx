"use client";
import React, { useState, useEffect } from 'react';
import { SavedAddress } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { savedAddressSchema, SavedAddressFormData } from '@/lib/schemas';
import { Input } from '@/components/ui/form/Input';
import { Textarea } from '@/components/ui/form/Textarea';
import { Select } from '@/components/ui/form/Select';

const KENYA_COUNTIES = [
    { value: 'Nairobi', label: 'Nairobi' },
    { value: 'Mombasa', label: 'Mombasa' },
    { value: 'Kisumu', label: 'Kisumu' },
    { value: 'Nakuru', label: 'Nakuru' },
    { value: 'Eldoret', label: 'Eldoret' },
    { value: 'Kiambu', label: 'Kiambu' },
    { value: 'Machakos', label: 'Machakos' },
    { value: 'Kajiado', label: 'Kajiado' },
    { value: 'Kilifi', label: 'Kilifi' },
    { value: 'Meru', label: 'Meru' },
    { value: 'Nyeri', label: 'Nyeri' },
    // Add more as needed or move to constants
];

export default function AddressBook() {
    const { user, updateProfile } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const methods = useForm<SavedAddressFormData>({
        resolver: zodResolver(savedAddressSchema),
        defaultValues: {
            label: '',
            county: '',
            city: '',
            details: '',
            isPrimary: false
        }
    });

    const { handleSubmit, reset, setValue } = methods;

    const addresses = user?.savedAddresses || [];

    const onSubmit = async (data: SavedAddressFormData) => {
        try {
            let newAddresses = [...addresses];

            // If setting as primary, unset others
            if (data.isPrimary) {
                newAddresses = newAddresses.map(a => ({ ...a, isPrimary: false }));
            }

            if (editingId) {
                newAddresses = newAddresses.map(a => a.id === editingId ? { ...data, id: editingId } : a);
            } else {
                const newAddress = { ...data, id: Date.now().toString() };
                newAddresses.push(newAddress);
            }

            await updateProfile({ savedAddresses: newAddresses });
            toast.success(editingId ? "Address updated" : "Address added");
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save address");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this address?")) return;
        try {
            const newAddresses = addresses.filter(a => a.id !== id);
            await updateProfile({ savedAddresses: newAddresses });
            toast.success("Address removed");
        } catch (error) {
            toast.error("Failed to remove address");
        }
    };

    const handleSetPrimary = async (id: string) => {
        try {
            const newAddresses = addresses.map(a => ({
                ...a,
                isPrimary: a.id === id
            }));
            await updateProfile({ savedAddresses: newAddresses });
            toast.success("Primary address updated");
        } catch (error) {
            toast.error("Failed to update primary address");
        }
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        reset({
            label: '',
            county: '',
            city: '',
            details: '',
            isPrimary: false
        });
    };

    const startEdit = (address: SavedAddress) => {
        setEditingId(address.id);
        setValue('label', address.label);
        setValue('county', address.county);
        setValue('city', address.city);
        setValue('details', address.details);
        setValue('isPrimary', address.isPrimary);
        setIsAdding(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Saved Addresses</h3>
                {!isAdding && (
                    <button
                        onClick={() => { resetForm(); setIsAdding(true); }}
                        className="px-4 py-2 bg-melagri-primary text-white text-xs font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-melagri-primary/20"
                    >
                        + Add New
                    </button>
                )}
            </div>

            {isAdding ? (
                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Input
                                    name="label"
                                    label="Label (e.g. Home, Farm 1)"
                                    placeholder="Home"
                                />
                            </div>
                            <div>
                                <Select
                                    name="county"
                                    label="County"
                                    options={KENYA_COUNTIES}
                                />
                            </div>
                            <div>
                                <Input
                                    name="city"
                                    label="City/Town"
                                    placeholder="e.g. Ruiru"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Textarea
                                    name="details"
                                    label="Specific Details (Landmarks, Road)"
                                    placeholder="Near the dairy plant, Green Gate"
                                    className="h-20"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isPrimary"
                                {...methods.register('isPrimary')}
                                className="rounded border-gray-300 text-melagri-primary focus:ring-melagri-primary/20"
                            />
                            <label htmlFor="isPrimary" className="text-xs font-bold text-gray-600">Set as primary delivery address</label>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:scale-105 transition-all">
                                {editingId ? "Update Address" : "Save Address"}
                            </button>
                        </div>
                    </form>
                </FormProvider>
            ) : addresses.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No saved addresses yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((address) => (
                        <div key={address.id} className={`bg-white p-6 rounded-3xl border transition-all ${address.isPrimary ? 'border-melagri-primary ring-1 ring-melagri-primary shadow-lg shadow-melagri-primary/5' : 'border-gray-100 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${address.isPrimary ? 'bg-melagri-primary/10 text-melagri-primary' : 'bg-gray-50 text-gray-400'}`}>
                                        📍
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{address.label}</p>
                                        {address.isPrimary && <span className="text-[8px] font-black text-melagri-primary uppercase tracking-widest bg-melagri-primary/10 px-1.5 py-0.5 rounded">Primary</span>}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => startEdit(address)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(address.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-600 font-medium">{address.details}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{address.city}, {address.county}</p>
                            </div>
                            {!address.isPrimary && (
                                <button
                                    onClick={() => handleSetPrimary(address.id)}
                                    className="mt-6 w-full py-2 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
                                >
                                    Set as primary
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
