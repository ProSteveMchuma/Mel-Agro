import { z } from 'zod';
import { KENYAN_COUNTIES } from './delivery.ts';

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

const phoneSchema = z.string().refine((val) => {
    const normalized = val.replace(/[\s()-]/g, '');
    const phoneRegex = /^(?:\+254|0)[17]\d{8}$/;
    return phoneRegex.test(normalized);
}, { message: "Invalid phone number try format: +254 7XX XXX XXX or 07XX XXX XXX" });

/** Full delivery address — still used for address book and delivery checkout. */
export const addressSchema = z.object({
    fullName: z.string().min(2, { message: "Full name is required" }).max(80, { message: "Name is too long" }),
    email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
    phone: phoneSchema,
    county: z.string().refine((county) => KENYAN_COUNTIES.includes(county), { message: "Please select a valid Kenyan county" }),
    town: z.string().min(2, { message: "Town is required" }),
    address: z.string().min(5, { message: "Please provide a valid address/landmark" }),
    lat: z.number().min(-5).max(6).optional(),
    lng: z.number().min(33).max(43).optional(),
});

/** Checkout shipping block: contact always required; address only when delivering. */
const checkoutShippingSchema = z.object({
    fullName: z.string().min(2, { message: "Full name is required" }).max(80, { message: "Name is too long" }),
    email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
    phone: phoneSchema,
    county: z.string().optional(),
    town: z.string().optional(),
    address: z.string().optional(),
    lat: z.number().min(-5).max(6).optional(),
    lng: z.number().min(33).max(43).optional(),
});

export const checkoutSchema = z.object({
    shipping: checkoutShippingSchema,
    shippingMethod: z.enum(['standard', 'pickup']),
    paymentMethod: z.enum(['mpesa', 'manual_mpesa', 'card', 'cod', 'whatsapp']),
    transactionCode: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.shippingMethod !== 'standard') return;

    if (!data.shipping.county || !KENYAN_COUNTIES.includes(data.shipping.county)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['shipping', 'county'],
            message: 'Please select a valid Kenyan county',
        });
    }
    if (!data.shipping.town || data.shipping.town.trim().length < 2) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['shipping', 'town'],
            message: 'Town is required',
        });
    }
    if (!data.shipping.address || data.shipping.address.trim().length < 5) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['shipping', 'address'],
            message: 'Please provide a valid address/landmark',
        });
    }
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
    isPrimary: z.boolean(),
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
