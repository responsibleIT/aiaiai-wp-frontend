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

// Function to decode HTML entities
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&#8211;/g, '—')  // em dash
    .replace(/&#8212;/g, '—')  // em dash
    .replace(/&#8220;/g, '"')  // left double quote
    .replace(/&#8221;/g, '"')  // right double quote
    .replace(/&#8217;/g, "'")  // right single quote
    .replace(/&#8216;/g, "'")  // left single quote
    .replace(/&amp;/g, '&')    // ampersand
    .replace(/&lt;/g, '<')     // less than
    .replace(/&gt;/g, '>')     // greater than
    .replace(/&quot;/g, '"')   // quote
    .replace(/&nbsp;/g, ' ');  // non-breaking space
}

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
    if (endpoint === "frontpage") {
      const response = await fetch(`${WP_API_URL}/frontpage`);
      if (!response.ok) {
        throw new Error(`WP API ${response.status} when fetching frontpage`);
      }
      return await response.json(); // single object
    }

    // Default: paginated fetch for arrays
    let allItems = [];
    let page = 1;
    const perPage = 100;
    while (true) {
      const response = await fetch(`${WP_API_URL}/${endpoint}?per_page=${perPage}&page=${page}`);
      if (!response.ok) {
        throw new Error(`WP API ${response.status} when fetching ${endpoint}`);
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) break;
      allItems = allItems.concat(data);
      if (data.length < perPage) break;
      page++;
    }
    return allItems;
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

function cleanWordPressUrls(content) {
  if (!content) return content;
  
  // Convert WordPress URLs to relative paths
  return content
    // Convert to root
    .replace(/https?:\/\/(?:wordpress\.)?aiaiai\.art\/homepage\/?(?=["'\s>]|$)/g, './')
    // convert to relative paths
    .replace(/https?:\/\/(?:wordpress\.)?aiaiai\.art\/homepage\/([^/"]+)\/?/g, './$1');
}

async function processTemplate(templatePath, outputPath, wpContent, pageName) {
  try {
    // Read template
    const template = await readFile(templatePath, "utf8");
    const $ = cheerio.load(template);

    // Parse WordPress content (clean URLs first)
    const cleanedContent = cleanWordPressUrls(wpContent.content || "");
    const $content = cheerio.load(cleanedContent);

    // Set page title and h1
    let pageTitle;
    if (pageName === "index") {
      // For the homepage use the WordPress title when available, otherwise default to "Home"
      pageTitle = capitalizeFirstLetter(
        decodeHtmlEntities(wpContent.title?.rendered) || "Home"
      );
    } else {
      // Use WordPress title if available, otherwise use default
      pageTitle = capitalizeFirstLetter(
        decodeHtmlEntities(wpContent.title?.rendered) || "Responsible IT Amsterdam"
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
        const $wpContent = $content;

        // For assignment pages, handle special content placement
        if (wpContent.class_list?.includes("category-oefening")) {
          const $firstP = $wpContent('p').first();
          if ($firstP.length) {
            // Store the paragraph content
            const introText = $firstP.html();
            // Remove it from the main content
            $firstP.remove();
            // Add it to the intro section
            $('.section--content__block--intro').html(`<p>${introText}</p>`);
          }

          // Find and extract the assignment block
          const $assignmentBlock = $wpContent('.wp-block-group.assignment');
          if ($assignmentBlock.length) {
            // Store the assignment content
            const assignmentContent = $assignmentBlock.clone();
            // Remove it from the main content
            $assignmentBlock.remove();
            // Add it after the wp-content block
            $('.wp-content').after(assignmentContent);
          }
        }
        
        // Insert the main content
        $(elem).html($wpContent.html());
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
async function findTemplate(pageName, wpContent) {
  const baseTemplate = join(TEMPLATES_DIR, "template.html");
  const normalizedPageName = pageName.toLowerCase().replace(/ /g, "-");
  
  // First check for category-specific template
  if (wpContent.class_list?.includes("category-oefening")) {
    const categoryTemplate = join(TEMPLATES_DIR, "assignment.html");
    try {
      await readFile(categoryTemplate, "utf8");
      console.log(`[${pageName}] Using category template: ${categoryTemplate}`);
      return categoryTemplate;
    } catch (error) {
      console.log(`[${pageName}] Category template not found, falling back to specific/base template`);
    }
  }

  // Then check for page-specific template
  const specificTemplate = join(TEMPLATES_DIR, `${normalizedPageName}.html`);
  try {
    await readFile(specificTemplate, "utf8");
    console.log(`[${pageName}] Using specific template: ${specificTemplate}`);
    return specificTemplate;
  } catch (error) {
    // If no specific template exists, use base template
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
    const homepage = await fetchWordPressContent("frontpage");
    const frontPageId = homepage?.id; // store ID to avoid duplicating the front page later
    const homeTemplate = await findTemplate("index", homepage);
    await processTemplate(
      homeTemplate,
      join(BUILD_DIR, "index.html"),
      {
        content: homepage?.content?.rendered,
        title: homepage?.title,
        class_list: homepage?.class_list,
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
        const pageTemplate = await findTemplate(page.slug, page);
        await processTemplate(
          pageTemplate,
          outputPath,
          {
            content: page.content?.rendered,
            title: page.title,
            class_list: page.class_list,
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
