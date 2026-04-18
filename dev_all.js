const { spawn } = require('child_process');

const apps = [
  { name: 'customer', port: 3001 },
  { name: 'admin', port: 3002 },
  { name: 'co-admin', port: 3003 },
  { name: 'manager', port: 3004 },
  { name: 'store', port: 3005 },
  { name: 'delivery', port: 3006 },
];

console.log('Starting all Smart Bazar panels...\n');

apps.forEach(({ name, port }) => {
  const process = spawn('npm', ['run', `dev:${name}`], {
    stdio: 'pipe',
    shell: true,
  });

  process.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[${name.toUpperCase()} (Port ${port})] ${output}`);
    }
  });

  process.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error) {
      console.error(`[${name.toUpperCase()} ERROR] ${error}`);
    }
  });

  console.log(`Started ${name} on http://localhost:${port}`);
});

console.log('\nAll panels are starting up! Please wait a few seconds.');
console.log('Use Ctrl+C to stop all panels at once.\n');
