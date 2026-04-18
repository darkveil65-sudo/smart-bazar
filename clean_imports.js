const fs = require('fs');
const apps = ['admin', 'co-admin', 'manager', 'store', 'delivery'];
apps.forEach(app => {
  const file = `apps/${app}/src/app/page.tsx`;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import Button from '@smart-bazar/shared/components/ui/Button';\n", '');
  content = content.replace("import Input from '@smart-bazar/shared/components/ui/Input';\n", '');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Cleaned ' + app);
});
