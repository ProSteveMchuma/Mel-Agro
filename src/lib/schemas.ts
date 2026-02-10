import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

// --- Auth Schemas ---

export const loginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
});

export const signupSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
        .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

// --- Checkout Schemas ---

export const addressSchema = z.object({
    firstName: z.string().min(2, { message: "First name is required" }),
    lastName: z.string().min(2, { message: "Last name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    phone: z.string().refine((val) => {
        // Basic Kenya phone validation or use libphonenumber-js strictly if preferred
        // Here we use a basic regex + length check for flexibility before strictening
        const phoneRegex = /^(?:\+254|0)[17]\d{8}$/;
        return phoneRegex.test(val.replace(/\s/g, '')) || (val.length >= 10 && val.length <= 15);
    }, { message: "Invalid phone number try format: +254 7XX XXX XXX or 07XX XXX XXX" }),
    county: z.string().min(1, { message: "Please select a county" }),
    town: z.string().min(2, { message: "Town is required" }),
    address: z.string().min(5, { message: "Please provide a valid address/landmark" }),
    lat: z.number().optional(),
    lng: z.number().optional(),
});

export const checkoutSchema = z.object({
    shipping: addressSchema,
    shippingMethod: z.enum(['standard', 'pickup']),
    paymentMethod: z.enum(['mpesa', 'card', 'cod', 'whatsapp']),
});

// --- Product/Admin Schemas ---

export const productSchema = z.object({
    name: z.string().min(3, { message: "Product name is required" }),
    price: z.coerce.number().min(1, { message: "Price must be greater than 0" }), // coerce handles string->number conversion
    category: z.string().min(1, { message: "Category is required" }),
    description: z.string().optional(),
    stockQuantity: z.coerce.number().min(0, { message: "Stock cannot be negative" }),
    image: z.string().min(1, { message: "Product image is required" }).or(z.any()), // Allow file object or string url
    featured: z.boolean().default(false),
});

export const savedAddressSchema = z.object({
    label: z.string().min(2, { message: "Label is required (e.g., Home)" }),
    county: z.string().min(2, { message: "County is required" }),
    city: z.string().min(2, { message: "City/Town is required" }),
    details: z.string().min(5, { message: "Please provide valid address details" }),
    isPrimary: z.boolean().default(false),
});

export const profileSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z.string().optional(),
    address: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type SavedAddressFormData = z.infer<typeof savedAddressSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
