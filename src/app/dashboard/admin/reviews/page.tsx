"use client";
import React, { useEffect, useState } from 'react';
import { Review, getAllReviewsForAdmin, updateReviewStatus } from '@/lib/reviews';
import { toast } from 'react-hot-toast';

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        setIsLoading(true);
        const data = await getAllReviewsForAdmin();
        setReviews(data);
        setIsLoading(false);
    };

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        const success = await updateReviewStatus(id, status);
        if (success) {
            toast.success(`Review ${status}`);
            setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } else {
            toast.error("Failed to update status");
        }
    };

    const filteredReviews = reviews.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Review Moderation</h1>
                    <p className="text-sm text-gray-500 mt-1 uppercase font-bold tracking-widest">Manage customer feedback and quality control</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-melagri-primary text-white shadow-lg shadow-melagri-primary/20' : 'text-gray-400 hover:text-gray-900'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white h-48 rounded-3xl animate-pulse border border-gray-100"></div>
                    ))}
                </div>
            ) : filteredReviews.length === 0 ? (
                <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 font-bold uppercase tracking-widest">No reviews found in this category</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredReviews.map(review => (
                        <div key={review.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-bold text-gray-400">
                                        {review.userName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{review.userName}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{review.date}</p>
                                    </div>
                                </div>
                                <div className="flex text-yellow-400 text-xs">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                                    ))}
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-6 leading-relaxed italic">"{review.comment}"</p>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${review.status === 'approved' ? 'bg-green-50 text-green-600' :
                                        review.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                            'bg-amber-50 text-amber-600'
                                    }`}>
                                    Status: {review.status}
                                </span>

                                <div className="flex gap-2">
                                    {review.status !== 'approved' && (
                                        <button
                                            onClick={() => handleStatusUpdate(review.id, 'approved')}
                                            className="px-4 py-2 bg-melagri-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-melagri-primary/10"
                                        >
                                            Approve
                                        </button>
                                    )}
                                    {review.status !== 'rejected' && (
                                        <button
                                            onClick={() => handleStatusUpdate(review.id, 'rejected')}
                                            className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all"
                                        >
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
