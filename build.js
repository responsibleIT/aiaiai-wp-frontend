import { config } from "dotenv";
import {
  mkdir,
  rm,
  readdir,
  readFile,
  writeFile,
  cp,
  copyFile,
} from "fs/promises";
import { join } from "path";
import * as cheerio from "cheerio";
import { fileURLToPath } from 'url';

config();

const BUILD_DIR = process.env.BUILD_DIR || "build";
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || "static/templates";
const WP_API_URL = process.env.WP_API_URL;

if (!WP_API_URL) {
  console.error('ERROR: build.js requires the WP_API_URL environment variable to be set.');
  process.exit(1);
}

// Ensure build directory exists
async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

async function fetchWordPressContent(endpoint) {
  try {
    // Special handling for home page
    if (endpoint === "homepage") {
      // Fetch the current front page via the public /frontpage endpoint provided by the WP REST-API Frontpage plugin
      const response = await fetch(`${WP_API_URL}/frontpage`);
      if (!response.ok) {
        throw new Error(`WP API ${response.status} when fetching homepage`);
      }
      return await response.json();
    }

    // Regular page/content fetching
    const response = await fetch(`${WP_API_URL}/${endpoint}`);
    if (!response.ok) {
      throw new Error(`WP API ${response.status} when fetching ${endpoint}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching WordPress content from ${endpoint}:`, error);
    throw error;
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function processTemplate(templatePath, outputPath, wpContent, pageName) {
  try {
    // Read template
    const template = await readFile(templatePath, "utf8");
    const $ = cheerio.load(template);

    // Parse WordPress content
    const $content = cheerio.load(wpContent.content || "");

    // Set page title and h1
    let pageTitle;
    if (pageName === "index") {
      // For the homepage use the WordPress title when available, otherwise default to "Home"
      pageTitle = capitalizeFirstLetter(
        wpContent.title?.rendered || "Home"
      );
    } else {
      // Use WordPress title if available, otherwise use default
      pageTitle = capitalizeFirstLetter(
        wpContent.title?.rendered || "Responsible IT Amsterdam"
      );
    }
    console.log(`[${pageName}] Final page title:`, pageTitle);

    // Set the h1 content and page title
    $(".section--content__block--hero h1").text(pageTitle);
    $("title").text(`${pageTitle} | Lectoraat Responsible IT`);

    // Replace content markers with WordPress content
    $(".wp-content").each((i, elem) => {
      const contentType = $(elem).data("wp-content");
      if (contentType === "content" && wpContent.content) {
        $(elem).html($content.html());
      }
    });

    // Write processed file
    await writeFile(outputPath, $.html());
    console.log(`Generated: ${outputPath}`);
  } catch (error) {
    console.error(`Error processing template ${templatePath}:`, error);
  }
}

async function copyStaticAssets() {
  try {
    // Copy all static assets except templates
    await cp("static/styles", join(BUILD_DIR, "styles"), { recursive: true });
    await cp("static/scripts", join(BUILD_DIR, "scripts"), { recursive: true });
    await cp("static/images", join(BUILD_DIR, "images"), { recursive: true });
    await cp("static/fonts", join(BUILD_DIR, "fonts"), { recursive: true });

    // Copy 404 page
    await copyFile("static/404.html", join(BUILD_DIR, "404.html"));

    console.log("Static assets copied successfully");
  } catch (error) {
    console.error("Error copying static assets:", error);
  }
}

// Helper function to find the most specific template for a page
async function findTemplate(pageName) {
  const baseTemplate = join(TEMPLATES_DIR, "template.html");
  const normalizedPageName = pageName.toLowerCase().replace(/ /g, "-");
  const specificTemplate = join(TEMPLATES_DIR, `${normalizedPageName}.html`);

  try {
    // Check if specific template exists
    await readFile(specificTemplate, "utf8");
    console.log(`[${pageName}] Using specific template: ${specificTemplate}`);
    return specificTemplate;
  } catch (error) {
    // If specific template doesn't exist, use base template
    console.log(`[${pageName}] Using base template: ${baseTemplate}`);
    return baseTemplate;
  }
}

export async function buildSite() {
  try {
    // Clear and recreate build directory
    await rm(BUILD_DIR, { recursive: true, force: true });
    await ensureDir(BUILD_DIR);

    // Copy static assets
    await copyStaticAssets();

    // First, handle the homepage specially since it needs to be index.html
    const homepage = await fetchWordPressContent("homepage");
    const frontPageId = homepage?.id; // store ID to avoid duplicating the front page later
    const homeTemplate = await findTemplate("index");
    await processTemplate(
      homeTemplate,
      join(BUILD_DIR, "index.html"),
      {
        content: homepage?.content?.rendered,
        title: homepage?.title,
      },
      "index"
    );

    // Get all other pages
    const pages = await fetchWordPressContent("pages");
    if (Array.isArray(pages)) {
      // Skip the homepage since we already handled it
      const otherPages = pages.filter((page) => page.id !== frontPageId);

      // Process each page using its slug
      for (const page of otherPages) {
        const outputPath = join(BUILD_DIR, `${page.slug}.html`);
        const pageTemplate = await findTemplate(page.slug);
        await processTemplate(
          pageTemplate,
          outputPath,
          {
            content: page.content?.rendered,
            title: page.title,
          },
          page.slug
        );
      }
    }

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
  }
}


if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSite();
}
