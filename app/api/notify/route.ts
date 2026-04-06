import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, postcode, phone, issue, isEmergency } = await req.json();

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set. Skipping email notification.");
      return NextResponse.json({ success: true, message: "Email skipped (no API key)" });
    }

    const subject = isEmergency ? `🚨 EMERGENCY LEAD: ${postcode}` : `New Lead: ${postcode}`;
    
    const { data, error } = await resend.emails.send({
      from: 'PlumbBot <onboarding@resend.dev>',
      to: [process.env.NOTIFICATION_EMAIL || 'mikesw15@gmail.com'],
      subject: subject,
      html: `
        <h1>${isEmergency ? '🚨 EMERGENCY PLUMBING LEAD' : 'New Plumbing Lead'}</h1>
        <p><strong>Issue:</strong> ${issue}</p>
        <p><strong>Postcode:</strong> ${postcode}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <hr />
        <p>Please call the customer back immediately.</p>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
