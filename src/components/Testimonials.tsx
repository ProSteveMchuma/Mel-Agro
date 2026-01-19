export default function Testimonials() {
    const testimonials = [
        {
            name: "John Kamau",
            role: "Maize Farmer, Eldoret",
            quote: "Mel-Agri has transformed my yield. The quality of seeds and the advice I get is unmatched.",
            rating: 5
        },
        {
            name: "Sarah Ochieng",
            role: "Horticulturist, Naivasha",
            quote: "Fast delivery and genuine products. I don't have to worry about fake fertilizers anymore.",
            rating: 5
        },
        {
            name: "David Njoroge",
            role: "Coffee Farmer, Nyeri",
            quote: "The customer service is excellent. They helped me choose the right pesticide for my crop.",
            rating: 5
        }
    ];

    return (
        <section className="py-24 bg-white">
            <div className="container-custom">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">What Our Farmers Say</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">Join thousands of satisfied farmers who trust Mel-Agri for their agricultural success.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow duration-300 border border-gray-100">
                            <div className="flex text-yellow-400 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-gray-700 italic mb-6 leading-relaxed">"{testimonial.quote}"</p>
                            <div>
                                <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                                <p className="text-sm text-gray-500">{testimonial.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
