export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getEmployeeByInternalId, updateEmployee, deleteEmployee, hashPin } from '@/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const emp = await getEmployeeByInternalId(id);
  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(emp);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { employee_id, name, face_photo, pin } = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof employee_id === 'string' && employee_id.trim()) patch.employee_id = employee_id.trim().toUpperCase();
  if (typeof name === 'string' && name.trim()) patch.name = name.trim();
  if (face_photo !== undefined) patch.face_photo = typeof face_photo === 'string' ? face_photo : null;
  if (typeof pin === 'string' && pin.trim()) patch.pin_hash = await hashPin(pin.trim());

  try {
    const emp = await updateEmployee(id, patch);
    if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(emp);
  } catch (err) {
    if ((err as Error).message === 'DUPLICATE_EMPLOYEE_ID') {
      return NextResponse.json(
        { error: 'This Employee ID is already in use.', error_fr: 'Cet identifiant est déjà utilisé.', code: 'DUPLICATE_EMPLOYEE_ID' },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteEmployee(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
