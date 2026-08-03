// Email fallback for notifications (per §7 of spec).
//
// When push delivery fails or the device is inactive, the notification
// service falls back to email. Uses `nodemailer` (already installed in
// Phase 1 for the password-reset flow).
//
// Sandbox behaviour: when `SMTP_HOST` is unset, the email body is logged
// to the console so developers can see what *would* have been sent. This
// mirrors how the password-reset flow handles a missing SMTP transport.

import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
  devMode?: boolean;
}

let transporter: Transporter | null = null;
let devMode = false;

function isConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!isConfigured()) {
    devMode = true;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Send an email. Returns `{ sent: false, devMode: true }` when SMTP is not
 * configured — the caller should treat this as "delivered to dev console".
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const t = getTransporter();
  if (!t) {
    console.info(
      JSON.stringify({
        level: "info",
        event: "email_dev_mode",
        to: input.to,
        subject: input.subject,
        body: input.text ?? input.html ?? "",
      }),
    );
    return { sent: false, devMode: true };
  }
  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM ?? "Resume Matchmaker <no-reply@matchmaker.local>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { sent: true, messageId: info.messageId };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Render a simple HTML notification email. */
export function renderNotificationEmail(params: {
  name?: string;
  title: string;
  body: string;
  url?: string;
}): { html: string; text: string } {
  const { name, title, body, url } = params;
  const greeting = name ? `Hi ${name},` : "Hi,";
  const text = `${greeting}\n\n${title}\n${body}\n${url ? `\nOpen: ${url}\n` : ""}\n— Resume Matchmaker`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <p style="margin: 0 0 16px;">${greeting}</p>
      <h2 style="font-size: 18px; margin: 0 0 8px; color: #047857;">${escapeHtml(title)}</h2>
      <p style="margin: 0 0 16px; line-height: 1.5;">${escapeHtml(body)}</p>
      ${
        url
          ? `<p style="margin: 16px 0;"><a href="${escapeHtml(url)}" style="display: inline-block; padding: 10px 18px; background: #047857; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Open in Matchmaker</a></p>`
          : ""
      }
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280; margin: 0;">You're receiving this because you enabled email notifications in Resume Matchmaker. Manage your preferences in Settings.</p>
    </div>
  `;
  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
