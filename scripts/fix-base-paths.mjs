import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const indexPath = join(distDir, 'index.html');
const manifestPath = join(distDir, 'manifest.webmanifest');

// Check if dist directory exists
if (!existsSync(distDir)) {
  console.error('❌ dist directory does not exist');
  process.exit(1);
}

// Fix index.html
try {
  if (!existsSync(indexPath)) {
    console.error('❌ index.html does not exist in dist directory');
    process.exit(1);
  }

  let indexHtml = readFileSync(indexPath, 'utf-8');
  indexHtml = indexHtml.replace(/%VITE_BASE%/g, '/nostrpop/');
  writeFileSync(indexPath, indexHtml);
  console.log('✅ Fixed base paths in index.html');
} catch (e) {
  console.error('❌ Error fixing index.html:', e.message);
  process.exit(1);
}

// Fix manifest if it exists
try {
  if (existsSync(manifestPath)) {
    let manifest = readFileSync(manifestPath, 'utf-8');
    manifest = manifest.replace(/%VITE_BASE%/g, '/nostrpop/');
    writeFileSync(manifestPath, manifest);
    console.log('✅ Fixed base paths in manifest.webmanifest');
  } else {
    console.log('ℹ️  manifest.webmanifest not found, skipping');
  }
} catch (e) {
  console.warn('⚠️  Warning: Could not fix manifest.webmanifest:', e.message);
  // Don't exit on manifest errors, it's optional
}

console.log('✅ Base path fixing complete');
