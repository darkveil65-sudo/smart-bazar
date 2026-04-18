const fs = require('fs');

// Fix each staff app's useEffect by replacing the duplicated redirect logic
// with a clean lookup-table approach that avoids TypeScript narrowing issues

const fixMap = [
  {
    app: 'manager',
    role: 'manager',
    dashboard: 'dashboard/manager',
  },
  {
    app: 'store',
    role: 'store',
    dashboard: 'dashboard/store',
  },
  {
    app: 'delivery',
    role: 'delivery',
    dashboard: 'dashboard/delivery',
  },
];

const newUseEffect = (cfg) => `  useEffect(() => {
    if (userData) {
      const roleMap: Record<string, string> = {
        admin: getAppUrl('admin') + '/dashboard/admin',
        'co-admin': getAppUrl('co-admin') + '/dashboard/admin',
        manager: getAppUrl('manager') + '/dashboard/manager',
        store: getAppUrl('store') + '/dashboard/store',
        delivery: getAppUrl('delivery') + '/dashboard/delivery',
        customer: getAppUrl('customer') + '/home',
      };
      const role = userData.role as string;
      if (role === '${cfg.role}') {
        window.location.href = window.location.origin + '/${cfg.dashboard}';
      } else {
        window.location.href = roleMap[role] || getAppUrl('customer') + '/home';
      }
    }
  }, [userData]);`;

fixMap.forEach(cfg => {
  const file = `apps/${cfg.app}/src/app/page.tsx`;
  let content = fs.readFileSync(file, 'utf8');

  // Match and replace the useEffect block
  const useEffectRegex = /  useEffect\(\(\) => \{[\s\S]*?\}, \[userData\]\);/;
  const replacement = newUseEffect(cfg);
  content = content.replace(useEffectRegex, replacement);

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Fixed useEffect in ${cfg.app}`);
});
