export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getAdminSettings, setAdminSettings } from '@/db';
import { verifyAdminPassword } from '@/lib/auth';

export async function GET() {
  const settings = await getAdminSettings();
  return NextResponse.json({
    recovery_email: settings?.recovery_email ?? null,
    recovery_phone: settings?.recovery_phone ?? null,
  });
}

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { recovery_email, recovery_phone, current_password } = body as Record<string, unknown>;

  if (typeof current_password !== 'string' || !current_password) {
    return NextResponse.json({ error: 'current_password is required' }, { status: 400 });
  }

  const valid = await verifyAdminPassword(current_password);
  if (!valid) {
    return NextResponse.json(
      { error: 'Incorrect current password', error_fr: 'Mot de passe actuel incorrect' },
      { status: 401 }
    );
  }

  const existing = await getAdminSettings();
  await setAdminSettings({
    password_hash: existing?.password_hash ?? null,
    recovery_email: typeof recovery_email === 'string' ? recovery_email.trim() || null : (existing?.recovery_email ?? null),
    recovery_phone: typeof recovery_phone === 'string' ? recovery_phone.trim() || null : (existing?.recovery_phone ?? null),
  });

  return NextResponse.json({ ok: true });
}
