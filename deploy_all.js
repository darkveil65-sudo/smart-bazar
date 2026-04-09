const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const apps = ['customer', 'admin', 'co-admin', 'manager', 'store', 'delivery'];

apps.forEach(app => {
    const appPath = path.join('apps', app);
    const projectName = `smart-bazar-${app}`;
    console.log(`\n--- Deploying ${projectName} ---`);
    
    try {
        // Link project
        console.log(`Linking ${projectName}...`);
        execSync(`vercel link --yes --project ${projectName}`, { cwd: appPath, stdio: 'inherit' });
        
        // Deploy to production
        console.log(`Deploying ${projectName}...`);
        execSync(`vercel --prod --yes`, { cwd: appPath, stdio: 'inherit' });
        
        console.log(`Success: ${projectName} deployed.`);
    } catch (error) {
        console.error(`Error deploying ${projectName}:`, error.message);
    }
});
