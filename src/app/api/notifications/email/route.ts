import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { requireUser } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';
import { reportIncident } from '@/lib/incident-reporting';

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'notification-email', 30, 60_000);
    if (limited) return limited;

    const auth = await requireUser(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const { to, subject, html } = await request.json();

        if (!to || !subject || !html) {
            return NextResponse.json({ success: false, message: 'To, Subject, and HTML body are required' }, { status: 400 });
        }

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const fromEmail = process.env.SMTP_FROM || '"Mel-Agri" <noreply@Mel-Agri.com>';

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.warn('Email provider is not configured; email was not sent.');
            return NextResponse.json({
                success: false,
                message: "Email provider is not configured"
            }, { status: 503 });
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort) || 587,
            secure: Number(smtpPort) === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        await transporter.sendMail({
            from: fromEmail,
            to,
            subject,
            html,
        });

        return NextResponse.json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error('Email API Error:', error);
        void reportIncident({ type: 'notification_failure', severity: 'warning', source: 'smtp', message: error instanceof Error ? error.message : 'Email delivery failed' });
        return NextResponse.json({ success: false, message: 'Failed to send email' }, { status: 500 });
    }
}
