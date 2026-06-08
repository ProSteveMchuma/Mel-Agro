import { redirect } from 'next/navigation';

// The dedicated signup page has been removed — /auth/login is now a unified
// "sign in or create account" surface (phone OTP, email magic link, and Google
// all auto-create accounts on first use). This stub permanently redirects any
// inbound traffic so old bookmarks, indexed pages, and email links keep working.
export default function SignupPage() {
    redirect('/auth/login');
}
