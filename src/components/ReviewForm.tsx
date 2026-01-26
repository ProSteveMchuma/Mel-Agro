"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { addReview } from "@/lib/reviews";

export default function ReviewForm({ productId, onReviewAdded }: { productId: string, onReviewAdded: () => void }) {
    const { user } = useAuth();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitting(true);
        const success = await addReview({
            productId,
            userId: user.uid,
            userName: user.name || "Anonymous",
            rating,
            comment
        });

        if (success) {
            setComment("");
            setRating(5);
            onReviewAdded();
        } else {
            alert("Failed to submit review. Please try again.");
        }
        setSubmitting(false);
    };

    if (!user) {
        return (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 text-center">
                <p className="text-gray-600 mb-4">Please log in to leave a review.</p>
                <a href={`/auth/login?callbackUrl=/products/${productId}`} className="btn-secondary inline-block text-sm">Log In</a>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Write a Review</h3>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className={`text-2xl focus:outline-none transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                        >
                            ★
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border-gray-300 focus:ring-melagri-primary focus:border-melagri-primary text-sm"
                    placeholder="Share your experience with this product..."
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex justify-center items-center"
            >
                {submitting ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                    "Submit Review"
                )}
            </button>
        </form>
    );
}
