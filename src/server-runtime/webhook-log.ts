export const WEBHOOK_LOGS: string[] = [];

export function addLog(msg: string) {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  WEBHOOK_LOGS.unshift(entry);
  if (WEBHOOK_LOGS.length > 50) WEBHOOK_LOGS.pop();
  console.log(entry);
}
