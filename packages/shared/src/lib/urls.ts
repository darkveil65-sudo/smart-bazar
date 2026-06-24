export const getAppUrl = (app: string) => {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    const ports: Record<string, number> = {
      customer: 3001,
      admin: 3002,
      manager: 3004,
      store: 3005,
      delivery: 3006,
    };
    
    // Use current hostname (IP or localhost) for dev redirects
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:${ports[app] || 3001}`;
  }
  
  // Production URLs based on deployment script output
  const prodUrls: Record<string, string> = {
    customer: 'https://smart-bazar-customer-phi.vercel.app',
    admin: 'https://smart-bazar-admin-six.vercel.app',
    manager: 'https://smart-bazar-manager-sand.vercel.app',
    store: 'https://smart-bazar-store-eight.vercel.app',
    delivery: 'https://smart-bazar-delivery-nu.vercel.app',
  };
  
  return prodUrls[app] || `https://smart-bazar-${app}.vercel.app`;
};
