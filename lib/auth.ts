import bcryptjs from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getAdminSettings, setAdminSettings } from '@/db';

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? 'dev-secret-change-in-production-32chars!'
);

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const settings = await getAdminSettings();
  if (settings?.password_hash) {
    return bcryptjs.compare(password, settings.password_hash);
  }
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return password === (process.env.ADMIN_PASSWORD ?? 'admin');
  }
  return bcryptjs.compare(password, hash);
}

export async function changeAdminPassword(
  currentPass: string,
  newPass: string
): Promise<{ ok: boolean; error?: string }> {
  const valid = await verifyAdminPassword(currentPass);
  if (!valid) {
    return { ok: false, error: 'Incorrect current password' };
  }
  const newHash = await bcryptjs.hash(newPass, 12);
  const existing = await getAdminSettings();
  await setAdminSettings({
    password_hash: newHash,
    recovery_email: existing?.recovery_email ?? null,
    recovery_phone: existing?.recovery_phone ?? null,
  });
  return { ok: true };
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}
