export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { changeAdminPassword } from '@/lib/auth';

export async function POST(req: Request) {
  const { current_password, new_password } = await req.json();
  if (!current_password || !new_password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (new_password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters', error_fr: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
  const result = await changeAdminPassword(current_password, new_password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json({ ok: true });
}
