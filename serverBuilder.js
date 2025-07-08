import { buildSite } from './build.js';

(async function main() {
  try {
    console.log('Rebuilding site…');
    await buildSite();
    console.log('Site build completed.');
  } catch (err) {
    console.error('Build failed:', err);
    process.exitCode = 1;
  }
})();