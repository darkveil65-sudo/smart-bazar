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

    // Add import if not present
    if (!content.includes('getAppUrl')) {
        content = content.replace(
            "import { useAuthStore }",
            "import { getAppUrl } from '@smart-bazar/shared/lib/urls';\nimport { useAuthStore }"
        );
    }

    // Replace router paths in useEffect
    content = content.replace(/router\.push\('\/dashboard\/admin'\)/g, "window.location.href = getAppUrl('admin') + '/dashboard/admin'");
    content = content.replace(/router\.push\('\/dashboard\/manager'\)/g, "window.location.href = getAppUrl('manager') + '/dashboard/manager'");
    content = content.replace(/router\.push\('\/dashboard\/store'\)/g, "window.location.href = getAppUrl('store') + '/dashboard/store'");
    content = content.replace(/router\.push\('\/dashboard\/delivery'\)/g, "window.location.href = getAppUrl('delivery') + '/dashboard/delivery'");
    content = content.replace(/router\.push\('\/home'\)/g, "window.location.href = getAppUrl('customer') + '/home'");

    fs.writeFileSync(absolutePath, content, 'utf8');
    console.log(`Updated redirects in ${filePath}`);
});
