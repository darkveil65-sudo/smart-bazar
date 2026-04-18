export const getAppUrl = (app: string) => {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    const ports: Record<string, number> = {
      customer: 3001,
      admin: 3002,
      'co-admin': 3003,
      manager: 3004,
      store: 3005,
      delivery: 3006,
    };
    
    // Use current hostname (IP or localhost) for dev redirects
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:${ports[app] || 3001}`;
  }
  
  // Production URLs based on deployment script output
  return `https://smart-bazar-${app}.vercel.app`;
};
