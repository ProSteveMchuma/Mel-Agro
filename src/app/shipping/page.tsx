import { redirect } from 'next/navigation';

/** Legacy URL — content lives on /delivery. */
export default function ShippingPage() {
    redirect('/delivery');
}
