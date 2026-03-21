import { sendSlackMessage } from './slack';
import { sendEmail } from './email';
import { markNotified } from '@/db';

export function fireNotifications(payload: {
  id: number;
  employeeName: string;
  action: 'in' | 'out';
  timestamp: string;
}): void {
  // Fire-and-forget — never blocks the API response
  void Promise.allSettled([
    sendSlackMessage(payload),
    sendEmail(payload),
  ]).then((results) => {
    const allOk = results.every((r) => r.status === 'fulfilled');
    if (allOk) {
      markNotified(payload.id);
    } else {
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Notification[${i}] failed:`, r.reason);
        }
      });
    }
  });
}
