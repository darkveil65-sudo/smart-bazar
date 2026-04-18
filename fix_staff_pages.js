const fs = require('fs');
const apps = ['admin', 'co-admin', 'manager', 'store', 'delivery'];

apps.forEach(app => {
  const file = `apps/${app}/src/app/page.tsx`;
  let content = fs.readFileSync(file, 'utf8');

  // Fix 1: Remove the React.CSSProperties style prop (not needed, cosmetic only)
  content = content.replace(
    /\s*style=\{\{ '--tw-ring-color': 'rgb\(99 102 241 \/ 0\.5\)' \} as React\.CSSProperties\}/g,
    ''
  );

  // Fix 2: Add focus:ring-primary class instead to the email input
  content = content.replace(
    /className="w-full pl-10 pr-4 py-3 bg-slate-700\/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition-all"/g,
    'className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"'
  );

  // Fix 3: Fix the forgot password input (same class)
  content = content.replace(
    /className="w-full pl-10 pr-4 py-3 bg-slate-700\/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all"/g,
    'className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Fixed ${app}`);
});
