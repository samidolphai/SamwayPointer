export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { listEmployees, createEmployee, hashPin } from '@/db';

export async function GET() {
  const employees = listEmployees();
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { employee_id, name, face_photo, pin } = body as Record<string, unknown>;

  if (typeof employee_id !== 'string' || !employee_id.trim()) {
    return NextResponse.json({ error: 'employee_id is required' }, { status: 400 });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  let pin_hash: string | null = null;
  if (typeof pin === 'string' && pin.trim()) {
    pin_hash = await hashPin(pin.trim());
  }

  try {
    const emp = createEmployee({
      employee_id: employee_id.trim().toUpperCase(),
      name: name.trim(),
      face_photo: typeof face_photo === 'string' ? face_photo : null,
      pin_hash,
    });
    return NextResponse.json(emp, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'DUPLICATE_EMPLOYEE_ID') {
      return NextResponse.json(
        {
          error: 'This Employee ID is already in use.',
          error_fr: 'Cet identifiant est déjà utilisé.',
          code: 'DUPLICATE_EMPLOYEE_ID',
        },
        { status: 409 }
      );
    }
    throw err;
  }
}
