import { z } from 'zod';

/** Accept HTML date inputs (YYYY-MM-DD) or full ISO datetimes from the Record Payment modal. */
export const paymentDateSchema = z.string().trim().min(8).max(40).transform((value, ctx) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00:00.000Z`;
  const iso = z.string().datetime().safeParse(value);
  if (iso.success) return iso.data;
  ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Payment date must be YYYY-MM-DD or an ISO datetime.' });
  return z.NEVER;
});

export const paymentTransactionSchema = z.object({
  amount: z.coerce.number().positive().max(100_000_000),
  reference: z.string().trim().min(3).max(200),
  date: paymentDateSchema,
  method: z.string().trim().min(2).max(80),
});

export const adminOrderMutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_processing'), orderId: z.string().min(1).max(200) }),
  z.object({
    action: z.literal('payment_status'),
    orderId: z.string().min(1).max(200),
    paymentStatus: z.enum(['Paid', 'Unpaid']),
    transaction: paymentTransactionSchema.optional(),
  }),
]);
