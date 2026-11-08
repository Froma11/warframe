const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'accounts.json');
if (!fs.existsSync(configPath)) {
  console.error('accounts.json not found in', __dirname);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const secret = config.proxySecret;

console.log('=== Cloudflare Multi-Worker Deployment Starting ===');
console.log('Loaded ' + config.accounts.length + ' worker accounts.\n');

for (const acc of config.accounts) {
  console.log('Deploying ' + acc.name + ' (' + acc.workerName + ')...');
  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: acc.apiToken,
    CLOUDFLARE_ACCOUNT_ID: acc.accountId
  };

  try {
    const cmd = 'npx --yes wrangler deploy --name ' + acc.workerName + ' --var PROXY_SECRET:' + secret + ' --var NODE_ID:' + acc.name;
    const out = execSync(cmd, { cwd: __dirname, env, encoding: 'utf8' });
    console.log(out);
    console.log('✓ Successfully deployed ' + acc.workerName + '\n');
  } catch (err) {
    console.error('✗ Failed to deploy ' + acc.workerName + ':', err.message);
  }
}

console.log('=== Deployment completed! ===');
