// api/send-contact.js — Vercel serverless function (ESM).
// Generated landing pages POST their contact/booking forms here.
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Email not configured' });

  try {
    const { name, email, phone, service, message, businessEmail, businessName } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }
    // Basic email shape check on the submitter's address (used as reply-to).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const safe = {
      name: esc(name), email: esc(email), phone: esc(phone),
      service: esc(service), message: esc(message), businessName: esc(businessName),
    };

    // Send the enquiry to the business owner.
    await resend.emails.send({
      from: 'Sitefliq Contact Form <noreply@sitefliq.com>',
      to: businessEmail || 'hello@sitefliq.com',
      replyTo: email,
      subject: `New enquiry from ${safe.name} — ${safe.businessName || 'your website'}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fafaf9">
          <div style="background:#f97316;padding:20px 24px;border-radius:12px 12px 0 0">
            <h2 style="color:white;margin:0;font-size:20px">New Website Enquiry</h2>
            <p style="color:rgba(255,255,255,.85);margin:4px 0 0;font-size:14px">From ${safe.businessName || 'your website'}</p>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;width:120px">Name</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600">${safe.name}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">Email</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827"><a href="mailto:${safe.email}" style="color:#f97316">${safe.email}</a></td></tr>
              ${safe.phone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">Phone</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827">${safe.phone}</td></tr>` : ''}
              ${safe.service ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">Service</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827">${safe.service}</td></tr>` : ''}
              <tr><td style="padding:10px 0;font-size:13px;color:#6b7280;vertical-align:top">Message</td><td style="padding:10px 0;font-size:14px;color:#111827;line-height:1.6">${safe.message}</td></tr>
            </table>
            <div style="margin-top:24px;padding:16px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa">
              <p style="margin:0;font-size:12px;color:#92400e">Reply directly to this email to respond to ${safe.name}.</p>
            </div>
          </div>
          <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">Sent via your Sitefliq website</p>
        </div>
      `,
    });

    // Send a confirmation to the person who submitted the form.
    await resend.emails.send({
      from: `${businessName || 'Website'} <noreply@sitefliq.com>`,
      to: email,
      subject: `We received your message — ${businessName || "we'll be in touch soon"}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fafaf9">
          <div style="background:#111827;padding:20px 24px;border-radius:12px 12px 0 0">
            <h2 style="color:white;margin:0;font-size:20px">Thanks for reaching out, ${safe.name}!</h2>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <p style="font-size:15px;color:#374151;line-height:1.7">We've received your message and will get back to you as soon as possible.</p>
            <p style="font-size:14px;color:#6b7280;line-height:1.7">Here's a copy of what you sent:</p>
            <div style="background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #f3f4f6;font-size:14px;color:#374151;line-height:1.7">${safe.message}</div>
          </div>
          <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">Powered by Sitefliq</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Email error:', e);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
