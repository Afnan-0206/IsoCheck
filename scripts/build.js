// scripts/build.js - Cross-platform root build runner for Cloudflare Pages and CI/CD
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const websiteDir = path.join(rootDir, 'website');
const websiteDist = path.join(websiteDir, 'dist');
const rootDist = path.join(rootDir, 'dist');

console.log('>>> [IsoCheck Build] Starting build pipeline...');
console.log(`>>> Root dir: ${rootDir}`);
console.log(`>>> Website dir: ${websiteDir}`);

// 1. Ensure website dependencies are installed
const websiteNodeModules = path.join(websiteDir, 'node_modules');
if (!fs.existsSync(websiteNodeModules)) {
  console.log('>>> Installing website dependencies...');
  execSync('npm ci || npm install', { cwd: websiteDir, stdio: 'inherit', shell: true });
}

// 2. Run website build
console.log('>>> Running Vite static build...');
execSync('npm run build', { cwd: websiteDir, stdio: 'inherit', shell: true });

// 3. Ensure root dist exists and copy built assets
if (fs.existsSync(websiteDist)) {
  console.log('>>> Syncing website/dist to root dist directory...');
  if (fs.existsSync(rootDist)) {
    fs.rmSync(rootDist, { recursive: true, force: true });
  }
  fs.cpSync(websiteDist, rootDist, { recursive: true });
  console.log('>>> Root dist successfully populated with static assets:');
  const files = fs.readdirSync(rootDist);
  files.forEach(f => console.log(`    - ${f}`));
} else {
  console.error('>>> Error: website/dist not found after build!');
  process.exit(1);
}

console.log('>>> [IsoCheck Build] Build completed successfully! Ready for Cloudflare Pages.');
