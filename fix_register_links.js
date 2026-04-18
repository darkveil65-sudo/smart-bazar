const fs = require('fs');
const path = require('path');

const filePaths = [
    'apps/admin/src/app/page.tsx',
    'apps/co-admin/src/app/page.tsx',
    'apps/customer/src/app/page.tsx',
    'apps/delivery/src/app/page.tsx',
    'apps/manager/src/app/page.tsx',
    'apps/store/src/app/page.tsx'
];

filePaths.forEach(filePath => {
    const absolutePath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(absolutePath)) {
        console.log(`Skipping ${filePath} (Not found)`);
        return;
    }

    let content = fs.readFileSync(absolutePath, 'utf8');

    // Replace the register click handler
    // Old: onClick={() => router.push('/register')}
    // New: onClick={() => window.location.href = getAppUrl('customer') + '/register'}
    
    const oldHandler = /onClick=\{\(\) => router\.push\('\/register'\)\}/g;
    const newHandler = "onClick={() => window.location.href = getAppUrl('customer') + '/register'}";

    if (content.match(oldHandler)) {
        content = content.replace(oldHandler, newHandler);
        fs.writeFileSync(absolutePath, content, 'utf8');
        console.log(`Updated register redirect in ${filePath}`);
    } else {
        console.log(`No relative register link found in ${filePath}`);
    }
});
