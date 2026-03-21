export async function sendSlackMessage(payload: {
  employeeName: string;
  action: 'in' | 'out';
  timestamp: string;
}): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const time = new Date(payload.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const date = new Date(payload.timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const emoji = payload.action === 'in' ? ':white_check_mark:' : ':wave:';
  const verb = payload.action === 'in' ? 'clocked *in*' : 'clocked *out*';

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${emoji} *${payload.employeeName}* ${verb} at ${time} on ${date}`,
    }),
  });
}
