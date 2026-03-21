export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getEmployeeById, getAttendanceState } from '@/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const employee_id = url.searchParams.get('employee_id')?.trim().toUpperCase();
  if (!employee_id) return NextResponse.json({ error: 'employee_id required' }, { status: 400 });
  const employee = getEmployeeById(employee_id);
  if (!employee) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const state = getAttendanceState(employee_id);
  return NextResponse.json({
    employee_name: employee.name,
    state: state?.state ?? null,
    since: state?.updated_at ?? null,
  });
}
