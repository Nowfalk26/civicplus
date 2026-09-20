const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
console.log('[BUILD] Executing unified build script from:', cwd);

// Case 1: Running from repository root (where backend/ and frontend/ exist)
if (fs.existsSync(path.join(cwd, 'backend'))) {
  console.log('[BUILD] Detected repository root.');
  console.log('[BUILD] Compiling backend...');
  execSync('npm --prefix backend run build', { stdio: 'inherit' });

  if (fs.existsSync(path.join(cwd, 'frontend'))) {
    console.log('[BUILD] Compiling frontend...');
    execSync('npm --prefix frontend run build', { stdio: 'inherit' });
  }
  console.log('[BUILD] Full build completed successfully.');
}
// Case 2: Running from inside backend/ directory (when Vercel Root Directory is set to "backend")
else if (fs.existsSync(path.join(cwd, 'src')) && fs.existsSync(path.join(cwd, 'tsconfig.json'))) {
  console.log('[BUILD] Detected backend project root. Compiling TypeScript...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('[BUILD] Backend build completed successfully.');
}
// Case 3: Running from inside frontend/ directory
else if (fs.existsSync(path.join(cwd, 'src')) && fs.existsSync(path.join(cwd, 'vite.config.ts'))) {
  console.log('[BUILD] Detected frontend project root. Building Vite bundle...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('[BUILD] Frontend build completed successfully.');
}
// Fallback
else {
  console.log('[BUILD] Defaulting to npm run build...');
  execSync('npm run build', { stdio: 'inherit' });
}
