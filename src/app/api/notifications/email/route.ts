import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
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
            console.warn("Missing SMTP environment variables. Logging email instead.");
            console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
            return NextResponse.json({
                success: true,
                message: "Email logged to console (Mock Mode - Missing SMTP Config)"
            });
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
        return NextResponse.json({ success: false, message: 'Failed to send email' }, { status: 500 });
    }
}
