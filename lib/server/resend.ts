import { Resend } from 'resend';

export function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY must be set (see .env.example).');
  return new Resend(key);
}

export function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'The Living Museum <onboarding@resend.dev>';
}
