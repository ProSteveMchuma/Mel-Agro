import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Log raw callback for debugging
        console.log("M-Pesa Callback:", JSON.stringify(data));

        const { Body } = data;
        const { stkCallback } = Body;

        if (!stkCallback) {
            return NextResponse.json({ message: 'Invalid callback data' }, { status: 400 });
        }

        const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

        // Find the order associated with this CheckoutRequestID
        // Note: You need to have saved CheckoutRequestID to the order when initiating payment
        // We will assume 'orders' collection has a field 'checkoutRequestId'
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("checkoutRequestId", "==", CheckoutRequestID));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`Order not found for CheckoutRequestID: ${CheckoutRequestID}`);
            return NextResponse.json({ message: 'Order not found' }, { status: 200 }); // Return 200 to ack Safaricom
        }

        const orderDoc = querySnapshot.docs[0];
        const orderId = orderDoc.id;

        if (ResultCode === 0) {
            // Payment Successful
            let mpesaReceiptNumber = '';

            if (CallbackMetadata && CallbackMetadata.Item) {
                const receiptItem = CallbackMetadata.Item.find((item: any) => item.Name === 'MpesaReceiptNumber');
                if (receiptItem) mpesaReceiptNumber = receiptItem.Value;
            }

            await updateDoc(doc(db, "orders", orderId), {
                paymentStatus: 'Paid',
                paymentMethod: 'M-Pesa',
                transactionId: mpesaReceiptNumber,
                status: 'Processing', // Move from 'Pending Payment' if applicable, or keep as Processing
                updatedAt: new Date().toISOString()
            });

            // Log transaction
            await addDoc(collection(db, "transactions"), {
                orderId,
                amount: stkCallback.CallbackMetadata?.Item?.find((i: any) => i.Name === 'Amount')?.Value,
                receipt: mpesaReceiptNumber,
                method: 'M-Pesa',
                date: new Date().toISOString(),
                status: 'Success',
                recordedBy: 'System (M-Pesa)'
            });

        } else {
            // Payment Failed / Cancelled
            await updateDoc(doc(db, "orders", orderId), {
                paymentStatus: 'Failed',
                paymentFailureReason: ResultDesc,
                updatedAt: new Date().toISOString()
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Callback Processing Error:", error);
        return NextResponse.json({ message: 'Error processing callback' }, { status: 500 });
    }
}
