import { z } from 'zod';

const TurnstileVerifyResponseSchema = z.object({
  success: z.boolean(),
  challenge_ts: z.string().optional(),
  hostname: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
  action: z.string().optional(),
  cdata: z.string().optional(),
});

export type VerifyTurnstileResult =
  | { ok: true }
  | { ok: false; reason: 'missing_secret' | 'missing_token' | 'verification_failed' | 'network_error' };

function getClientIpFromHeaders(headers: Headers): string | null {
  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  const forwardedFor = headers.get('x-forwarded-for')?.trim();
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null;

  return null;
}

export async function verifyTurnstile(options: {
  token: string | null | undefined;
  headers?: Headers;
}): Promise<VerifyTurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: false, reason: 'missing_secret' };
  const token = options.token?.trim();
  if (!token) return { ok: false, reason: 'missing_token' };

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);

  const ip = options.headers ? getClientIpFromHeaders(options.headers) : null;
  if (ip) body.set('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = TurnstileVerifyResponseSchema.parse(await res.json());
    if (!json.success) return { ok: false, reason: 'verification_failed' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network_error' };
  }
}

