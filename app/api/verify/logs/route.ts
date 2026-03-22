export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { listVerificationLogs } from '@/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') ?? 1);
  const pageSize = Number(url.searchParams.get('pageSize') ?? 50);
  const name = url.searchParams.get('name') ?? undefined;
  const from = url.searchParams.get('from') ?? undefined;
  const to = url.searchParams.get('to') ?? undefined;
  const result = await listVerificationLogs({ page, pageSize, name, from, to });
  return NextResponse.json(result);
}
