import { permanentRedirect } from 'next/navigation';

/** Legacy URL — content lives on /delivery. */
export default function ShippingPage() {
    permanentRedirect('/delivery');
}
