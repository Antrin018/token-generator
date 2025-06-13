// app/api/send-display-link/route.ts

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email, doctorId } = await req.json();

  const displayUrl = `https://token-generator-virid.vercel.app/display/${doctorId}`;

  try {
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Your Display Page Link',
      html: `<p>Hello Doctor,</p>
             <p>Here is your personal display page link:</p>
             <a href="${displayUrl}">${displayUrl}</a>
             <p>Bookmark it for quick access.</p>`,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Email send failed:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
