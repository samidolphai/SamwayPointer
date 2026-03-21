export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getRecordPhoto } from '@/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const photo = getRecordPhoto(Number(id));
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ photo });
}
