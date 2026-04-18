const fs = require('fs');
const apps = ['admin', 'co-admin', 'manager', 'store', 'delivery'];

apps.forEach(app => {
  const file = `apps/${app}/src/app/page.tsx`;
  let content = fs.readFileSync(file, 'utf8');

  // Fix TS2783: 'id' specified more than once
  // Change: { id: userDoc.id, ...data } as UserData
  // To: { ...data, id: userDoc.id } as UserData
  content = content.replace(
    /userData: \{ id: userDoc\.id, \.\.\.data \} as UserData/g,
    'userData: { ...data, id: userDoc.id } as UserData'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Fixed ${app}`);
});
