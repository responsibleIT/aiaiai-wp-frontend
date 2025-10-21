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
import { fileURLToPath } from "url";
import { imageCollection } from "./imageCollection.js";

// Function to decode HTML entities
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&#8211;/g, "—") // em dash
    .replace(/&#8212;/g, "—") // em dash
    .replace(/&#8220;/g, '"') // left double quote
    .replace(/&#8221;/g, '"') // right double quote
    .replace(/&#8217;/g, "'") // right single quote
    .replace(/&#8216;/g, "'") // left single quote
    .replace(/&amp;/g, "&") // ampersand
    .replace(/&lt;/g, "<") // less than
    .replace(/&gt;/g, ">") // greater than
    .replace(/&quot;/g, '"') // quote
    .replace(/&nbsp;/g, " "); // non-breaking space
}

config();

const BUILD_DIR = process.env.BUILD_DIR || "build";
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || "static/templates";
const WP_API_URL = process.env.WP_API_URL;

if (!WP_API_URL) {
  console.error(
    "ERROR: build.js requires the WP_API_URL environment variable to be set."
  );
  process.exit(1);
}

let assignmentColors = [];

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
      const response = await fetch(
        `${WP_API_URL}/${endpoint}?per_page=${perPage}&page=${page}`
      );
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
  return (
    content
      // Convert to root
      .replace(
        /https?:\/\/(?:wordpress\.)?aiaiai\.art\/homepage\/?(?=["'\s>]|$)/g,
        "./"
      )
      // convert to relative paths
      .replace(
        /https?:\/\/(?:wordpress\.)?aiaiai\.art\/homepage\/([^/"]+)\/?/g,
        "./$1"
      )
  );
}

function createHeroImageHTML(imageData) {
  if (!imageData || !imageData.downloads) return "";

  // Sort downloads by width for proper srcset order
  const sortedDownloads = imageData.downloads
    .filter((d) => d.width && d.height)
    .sort((a, b) => a.width - b.width);

  if (sortedDownloads.length === 0) return "";

  // Use medium as default src, fallback to first available
  const defaultSrc =
    sortedDownloads.find((d) => d.size === "medium") || sortedDownloads[0];
  const basePath = `./assets/collection/${imageData.slug}`;

  // Build srcset string
  const srcset = sortedDownloads
    .map((d) => `${basePath}/${d.filename} ${d.width}w`)
    .join(", ");

  return `
    <figure class="hero-image">
      <img 
        src="${basePath}/${defaultSrc.filename}"
        srcset="${srcset}"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
        alt="${imageData.altText || ""}"
        width="${defaultSrc.width}"
        height="${defaultSrc.height}"
        loading="eager"
        decoding="async"
      />
    </figure>
  `;
}

function createGridImageHTML(imageData) {
  if (!imageData || !imageData.downloads) return "";

  // Filter to smaller sizes suitable for grid display (exclude full, large, 1536x1536)
  const gridSizes = ["thumbnail", "medium", "medium_large"];
  const gridDownloads = imageData.downloads
    .filter((d) => gridSizes.includes(d.size) && d.width && d.height)
    .sort((a, b) => a.width - b.width);

  if (gridDownloads.length === 0) {
    // Fallback to any available size if no grid sizes found
    const fallbackDownloads = imageData.downloads
      .filter((d) => d.width && d.height)
      .sort((a, b) => a.width - b.width);
    if (fallbackDownloads.length === 0) return "";

    const fallbackSrc = fallbackDownloads[0];
    const basePath = `./assets/collection/${imageData.slug}`;

    return `
      <figure class="grid-image">
        <img 
          src="${basePath}/${fallbackSrc.filename}"
          alt="${imageData.altText || ""}"
          width="${fallbackSrc.width}"
          height="${fallbackSrc.height}"
          loading="lazy"
          decoding="async"
        />
      </figure>
    `;
  }

  // Use thumbnail as default src for grid, fallback to smallest available
  const defaultSrc =
    gridDownloads.find((d) => d.size === "thumbnail") || gridDownloads[0];
  const basePath = `./assets/collection/${imageData.slug}`;

  // Build srcset string with only grid-appropriate sizes
  const srcset = gridDownloads
    .map((d) => `${basePath}/${d.filename} ${d.width}w`)
    .join(", ");

  return `
    <figure class="grid-image">
      <img 
        src="${basePath}/${defaultSrc.filename}"
        srcset="${srcset}"
        sizes="(max-width: 35rem) 100vw, (max-width: 55rem) 50vw, 33vw"
        alt="${imageData.altText || ""}"
        width="${defaultSrc.width}"
        height="${defaultSrc.height}"
        loading="lazy"
        decoding="async"
      />
    </figure>
  `;
}

async function processTemplate(
  templatePath,
  outputPath,
  wpContent,
  pageName,
  assignmentImages = null
) {
  try {
    // Read template
    const template = await readFile(templatePath, "utf8");
    const $ = cheerio.load(template);

    // Parse WordPress content (clean URLs first)
    const cleanedContent = cleanWordPressUrls(wpContent.content || "");
    const $content = cheerio.load(cleanedContent);
    const isAssignment = wpContent.class_list?.includes("category-oefening");

    // Set page title and h1
    let pageTitle;
    if (pageName === "index") {
      // skip!
    } else {
      // Use WordPress title if available, otherwise use default
      pageTitle = capitalizeFirstLetter(
        decodeHtmlEntities(wpContent.title?.rendered) || "No title"
      );
    }
    console.log(`[${pageName}] Final page title:`, pageTitle);

    // Set the h1 content and page title
    if (pageName === "index") {
      // ! change this !
      $("h1").html(pageTitle);
      $("title").text(`AIAIAI | Learn how to play, fail & tinker with machines`);
    } else {
      $("h1").text(pageTitle);
      $("title").text(`AIAIAI | ${pageTitle}`);
    }

    // Set body data-color for assignment pages, derived from category-<suffix> (fallback: purple)
    if (isAssignment) {
      // Use the centralized helper so it's consistent with other code
      const color = getAssignmentColor(wpContent.class_list);

      const $body = $("body");

      const previousStyle = $body.attr("style") || "";
      const needsSemicolon =
        previousStyle && !previousStyle.trim().endsWith(";");
      const updatedStyle = `${previousStyle}${needsSemicolon ? ";" : ""}${
        previousStyle ? " " : ""
      }--assignment-color: var(--${color}); --assignment-color-l: var(--${color}-l); --assignment-color-d: var(--${color}-d);`;
      $body.attr("style", updatedStyle);

      // Use kebab-case data attribute name (consistent with HTML data-* conventions)
      $body.attr("data-color-theme", color);
    }
    console.log(isAssignment);

    // Add hero image if available
    if (wpContent.featured_image) {
      let heroImage = createHeroImageHTML(wpContent.featured_image);
      const $hero = cheerio.load(heroImage);
      $hero("figure img").attr(
        "style",
        `--vt-name:${pageTitle
          .trim()
          .replace(/[.,\/\-]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase()}`
      );
      heroImage = $hero.html();
      $(".section--content__block--hero").prepend(heroImage);
    }

    // Replace content markers with WordPress content
    $(".wp-content").each((i, elem) => {
      const contentType = $(elem).data("wp-content");
      if (contentType === "content" && wpContent.content) {
        const $wpContent = $content;

        // For assignment pages, handle special content placement
        if (isAssignment) {
          const $inspired = $wpContent(".inspired");
          if ($inspired.length) {
            // Store the paragraph content
            const introText = $inspired.html();
            // Remove it from the main content
            $inspired.remove();
            $wpContent(".description").prepend(`<h1>${pageTitle}</h1>`);
            // Add it to the intro section
            $(".section--content__block--intro").append(
              `<div class="inspired">${introText}</div>`
            );
          }

          // Find and extract the assignment block
          const $assignmentBlock = $wpContent(".wp-block-group.assignment");
          if ($assignmentBlock.length) {
            // Store the assignment content
            const assignmentContent = $assignmentBlock.clone();
            // Remove it from the main content
            $assignmentBlock.remove();
            // Add it after the wp-content block
            $(".wp-content").after(assignmentContent);
          }
        }
        // For homepage, enhance assignment links with grid images
        if (pageName === "index" && assignmentImages) {
          enhanceHomepageAssignmentLinks($wpContent, assignmentImages);
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

function enhanceHomepageAssignmentLinks($content, assignmentImages) {
  $content("li.wp-block-pages-list__item").each((i, listItem) => {
    const $listItem = $content(listItem);
    const $link = $listItem.find("a.wp-block-pages-list__item__link");

    if (!$link.length) return;

    $listItem.attr(
      "style",
      `--vt-name:${$link
        .text()
        .trim()
        .replace(/[.,\/\-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()}`
    );

    $link.text("");

    const href = $link.attr("href");
    if (!href) return;

    // Extract slug from href (e.g., "./assignment-slug" -> "assignment-slug")
    const slugMatch = href.match(/\.\/([^\.]+)(?:\.html)?$/);
    if (!slugMatch) return;

    const slug = slugMatch[1];

    // Lookup color and image using the slug
    const colorData = assignmentColors.find((c) => c.name === slug);
    if (colorData) {
      $link.attr(
        "style",
        `--assignment-color: var(--${colorData.color}); --assignment-color-l: var(--${colorData.color}-l); --assignment-color-d: var(--${colorData.color}-d);`
      );
    }

    const imageData = assignmentImages[slug];
    if (imageData) {
      const gridImageHTML = createGridImageHTML(imageData);
      if (gridImageHTML) {
        $link.prepend(gridImageHTML);
        console.log(`[homepage] Added grid image for assignment: ${slug}`);
      }
    }
  });
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
      console.log(
        `[${pageName}] Category template not found, falling back to specific/base template`
      );
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

function getAssignmentColor(classList = []) {
  // handle DOMTokenList or single string or array
  const list = Array.isArray(classList)
    ? classList
    : classList &&
      typeof classList === "object" &&
      typeof classList.length === "number"
    ? Array.from(classList)
    : String(classList).split(/\s+/);

  const excluded = new Set(["oefening", "inspired-by", "made-by"]);

  for (const cls of list) {
    if (!cls) continue;
    const match = cls.match(/^category-(.+)$/i);
    if (!match) continue;
    const name = match[1].toLowerCase().trim();
    if (!name || excluded.has(name)) continue;
    console.log(name);

    return name;
  }

  return "lilia";
}

export async function buildSite() {
  try {
    // Clear and recreate build directory
    await rm(BUILD_DIR, { recursive: true, force: true });
    await ensureDir(BUILD_DIR);

    // Copy static assets
    await copyStaticAssets();

    // First get homepage to get the frontPageId
    const homepage = await fetchWordPressContent("frontpage");
    let aboutpage;
    const frontPageId = homepage?.id;

    // Get all other pages to collect assignment images
    const pages = await fetchWordPressContent("pages");
    let assignmentImages = {};
    if (Array.isArray(pages)) {
      // Skip the homepage since we'll handle it later
      const otherPages = pages.filter((page) => page.id !== frontPageId);

      // Collect assignment pages for a print-all manifest
      const assignmentPages = [];

      // Process each page using its slug
      for (const page of otherPages) {
        const outputPath = join(BUILD_DIR, `${page.slug}.html`);
        const pageTemplate = await findTemplate(page.slug, page);

        // Download featured image for assignment pages and about pages
        let featuredImage = null;
        if (
          (page.class_list?.includes("category-oefening") || 
           page.class_list?.includes("category-about")) &&
          page.featured_media
        ) {
          featuredImage = await imageCollection(
            page.featured_media,
            WP_API_URL
          );

          // Download the image files
          const imageFolder = join(
            BUILD_DIR,
            "assets",
            "collection",
            featuredImage.slug
          );
          await ensureDir(imageFolder);

          for (const download of featuredImage.downloads) {
            try {
              const response = await fetch(download.url);
              const buffer = await response.arrayBuffer();
              await writeFile(
                join(imageFolder, download.filename),
                Buffer.from(buffer)
              );
              console.log(
                `[${page.slug}] Downloaded: ${featuredImage.slug}/${download.filename}`
              );
            } catch (error) {
              console.error(
                `[${page.slug}] Error downloading ${download.url}:`,
                error
              );
            }
          }
        }

        if (page.class_list?.includes("category-oefening")) {
          const color = getAssignmentColor(page.class_list);
          console.log("color", color);

          // Add to global color array
          assignmentColors.push({
            name: page.slug,
            color: color,
          });

          console.log(`[${page.slug}] Assigned color: ${color}`);
        }

        await processTemplate(
          pageTemplate,
          outputPath,
          {
            content: page.content?.rendered,
            title: page.title,
            class_list: page.class_list,
            featured_image: featuredImage,
          },
          page.slug
        );

        // Build up assignment manifest entry when applicable
        if (page.class_list?.includes("category-oefening")) {
          assignmentPages.push({
            slug: page.slug,
            path: `./${page.slug}.html`,
            featured_image: featuredImage?.slug || null,
          });

          // Store featured image data for homepage grid
          if (featuredImage) {
            assignmentImages[page.slug] = featuredImage;
          }
        }

        if (page.class_list?.includes("category-about")) {
          aboutpage = {
            slug: page.slug,
            path: `./aiaiai-art.html`,
            featured_image: featuredImage?.slug || null,
          };
        }
      }

      // Write the assignments manifest to the assets/json directory
      try {
        const assetsJsonDir = join(BUILD_DIR, "assets", "json");
        await ensureDir(assetsJsonDir);
        const manifestPath = join(assetsJsonDir, "assignments.json");
        await writeFile(manifestPath, JSON.stringify(assignmentPages, null, 2));
      } catch (manifestError) {
        console.error("Failed to write assignments manifest:", manifestError);
      }
    }

    // Now handle the homepage with assignment images
    const homeTemplate = await findTemplate("index", homepage);
    await processTemplate(
      homeTemplate,
      join(BUILD_DIR, "index.html"),
      {
        content: homepage?.content?.rendered,
        title: homepage?.title,
        class_list: homepage?.class_list,
      },
      "index",
      assignmentImages
    );

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildSite();
}
