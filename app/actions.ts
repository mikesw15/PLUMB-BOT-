'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLeadEmail(formData: FormData) {
  const name = formData.get('name') as string;
  const company = formData.get('company') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const area = formData.get('area') as string;
  const interest = formData.get('interest') as string;

  try {
    const { data, error } = await resend.emails.send({
      from: 'PlumbBot AI <onboarding@resend.dev>',
      to: ['mikesw15@gmail.com'], // Using the user's email from context
      subject: `New Lead: ${name} from ${company}`,
      html: `
        <h2>New Lead Received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Area Covered:</strong> ${area}</p>
        <p><strong>Interested in:</strong> ${interest}</p>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Submission Error:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
