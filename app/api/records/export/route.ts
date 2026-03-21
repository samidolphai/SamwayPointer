export const runtime = 'nodejs';

import { getAllForExport } from '@/db';

export async function GET() {
  const records = getAllForExport();

  const header = 'id,employee_id,employee_name,action,timestamp,notified\n';
  const rows = records
    .map(
      (r) =>
        `${r.id},${r.employee_id ?? ''},"${r.employee_name.replace(/"/g, '""')}",${r.action},${r.timestamp},${r.notified}`
    )
    .join('\n');

  return new Response(header + rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clock_records_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
