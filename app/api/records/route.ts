export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { queryRecords } from '@/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get('name') ?? undefined;
  const from = url.searchParams.get('from') ?? undefined;
  const to = url.searchParams.get('to') ?? undefined;
  const page = Number(url.searchParams.get('page') ?? 1);
  const pageSize = Number(url.searchParams.get('pageSize') ?? 50);

  const result = queryRecords({ name, from, to, page, pageSize });
  return NextResponse.json(result);
}
