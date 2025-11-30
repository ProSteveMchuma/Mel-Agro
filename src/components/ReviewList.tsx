import { Review } from "@/lib/reviews";

export default function ReviewList({ reviews }: { reviews: Review[] }) {
    if (reviews.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h4 className="font-bold text-gray-900">{review.userName}</h4>
                            <div className="flex text-yellow-400 text-sm mt-1">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                        </div>
                        <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                </div>
            ))}
        </div>
    );
}
