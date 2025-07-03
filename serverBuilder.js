import { readdir, mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from 'fs';
import { buildSite } from './build.js';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Variables
const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, 'cache');
const CACHE_FILE = `${CACHE_DIR}/pages-index.json`;
const WP_BASE    = 'https://responsible-it.nl/wp-json/wp/v2/pages';
const FIELDS     = '_fields=id,modified';
const PER_PAGE   = 100;                            // WP API max

// Fetch pages from WordPress API
async function fetchAllPages() {
  let page = 1, totalPages = 1;
  const list = [];

  do {
    const url  = `${WP_BASE}?${FIELDS}&per_page=${PER_PAGE}&page=${page}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`WP API ${res.status}`);
    list.push(...await res.json());

    totalPages = Number(res.headers.get('X-WP-TotalPages')) || 1;
    page++;
  } while (page <= totalPages);

  // Sort for deterministic order (not guaranteed by WP)
  return list.sort((a, b) => a.id - b.id);
}

// Check cache directory
async function checkCache() {
    await ensureCacheDir();
  
    const cacheDir = "cache";
    const cacheFiles = await readdir(cacheDir);
    console.log(cacheFiles);
  }
  
  // Ensure cache directory exists
  async function ensureCacheDir(cacheDir = "cache") {
    await mkdir(cacheDir, { recursive: true });
  }

  // Check if cache file exists and is different from fresh data
  async function shouldBuild(freshJson) {
    if (!existsSync(CACHE_FILE)) return true;
    const cachedJson = await readFile(CACHE_FILE, 'utf8');
    return cachedJson !== freshJson;
  }

  async function writeHealthCheck() {
    await writeFile('cache/last-run.txt', new Date().toISOString());
  }

  // Main function to check for changes and rebuild if needed
  async function main() {
    await ensureCacheDir();
    
    try {
      const fresh = await fetchAllPages();
      const freshJson = JSON.stringify(fresh);

      if (await shouldBuild(freshJson)) {
        console.log('Changes detected → rebuilding…');
        await buildSite();
        await writeFile(CACHE_FILE, freshJson, 'utf8');
        console.log('Cache updated.');
      } else {
        console.log('No changes since last build; skipping.');
      }
      
      await writeHealthCheck();  // Record successful run
    } catch (err) {
      console.error('Failed:', err);
      process.exitCode = 1;
      throw err;  // Let Coolify know it failed
    }
  }

  checkCache();
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });