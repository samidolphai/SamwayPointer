export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { deleteRecord } from '@/db';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const deleted = await deleteRecord(numId);
  if (!deleted) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
