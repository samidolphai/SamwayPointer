export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { getAdminSettings, setAdminSettings } from '@/db';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { contact, new_password } = body;

  if (!contact || typeof contact !== 'string' || !contact.trim()) {
    return NextResponse.json({ error: 'Email or phone is required.' }, { status: 400 });
  }
  if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
  }

  const settings = await getAdminSettings();

  if (!settings?.recovery_email && !settings?.recovery_phone) {
    return NextResponse.json(
      { error: 'No recovery information configured. Set it up in Admin → Profile & Security.' },
      { status: 404 }
    );
  }

  const trimmed = contact.trim().toLowerCase();
  const emailMatch = settings.recovery_email?.trim().toLowerCase() === trimmed;
  const phoneMatch =
    settings.recovery_phone?.replace(/[\s\-().+]/g, '') ===
    contact.trim().replace(/[\s\-().+]/g, '');

  if (!emailMatch && !phoneMatch) {
    return NextResponse.json({ error: 'This email or phone does not match our records.' }, { status: 401 });
  }

  const hash = await bcryptjs.hash(new_password as string, 12);
  await setAdminSettings({ ...settings, password_hash: hash });

  return NextResponse.json({ ok: true });
}
