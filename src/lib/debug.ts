export const pushDebugLog = (msg: string, detail?: any) => {
  const ts = Date.now();
  const detailStr = detail ? ' | ' + JSON.stringify(detail) : '';
  const entry = `[${ts}] ${msg}${detailStr}`;
  if (typeof window !== 'undefined') {
    (window as any).__avatarDebugLog = (window as any).__avatarDebugLog || [];
    (window as any).__avatarDebugLog.push(entry);
    const stored = localStorage.getItem('avatarDebugLog') || '[]';
    try {
      const parsed = JSON.parse(stored);
      parsed.push(entry);
      localStorage.setItem('avatarDebugLog', JSON.stringify(parsed));
    } catch (e) {
      localStorage.setItem('avatarDebugLog', JSON.stringify([entry]));
    }
    console.log(entry);
  }
};

if (typeof window !== 'undefined') {
  (window as any).printDebugLog = () => {
    const stored = localStorage.getItem('avatarDebugLog') || '[]';
    console.log('--- AVATAR PERSISTENT DEBUG LOG ---');
    try {
      JSON.parse(stored).forEach((msg: string) => console.log(msg));
    } catch (e) {
      console.log(stored);
    }
    console.log('-----------------------------------');
  };
  (window as any).clearDebugLog = () => {
    localStorage.removeItem('avatarDebugLog');
    (window as any).__avatarDebugLog = [];
  };
}
