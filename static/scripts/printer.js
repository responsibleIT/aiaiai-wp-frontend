// Print container
const printAll = document.querySelector(".print-all");

// Track what content is currently loaded
let currentPrintContent = null; // 'all', ['slug1', 'slug2'], 'single-slug', or null

// Print listener
const printButton = document.querySelector(".print-page button");
printButton &&
  printButton.addEventListener("click", () => {
    currentMain?.classList.remove("no-print");
    printAll?.classList.add("no-print");

    window.print();
  });

const currentMain = document.querySelector("main#main");

// Print all listener
const printAllButton = document.querySelector("[data-type=printAll]");
printAllButton &&
  printAllButton.addEventListener("click", async () => {
    printAll.classList.remove("no-print");
    currentMain
      ? currentMain.classList.add("no-print")
      : document.querySelector("body").classList.add("no-print");

    // Default is print all - wait for content to load
    await selectivePrint();
  });

function createPrintIframe() {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html lang="nl"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Print</title>
    <link rel="stylesheet" href="styles/tokens--fonts.css">
    <link rel="stylesheet" href="styles/tokens--colors.css">
    <link rel="stylesheet" href="styles/general.css">
    <link rel="stylesheet" href="styles/general--text.css">
    <link rel="stylesheet" href="styles/assignment--main.css">
    <link rel="stylesheet" href="styles/print.css">
  </head><body><div id="print-root"></div></body></html>`);
  doc.close();

  return iframe;
}

async function printHTMLInIsolatedStyles(html) {
  let iframe = document.querySelector("iframe");

  // If no iframe exists, create one
  if (!iframe) {
    iframe = createPrintIframe();
  }

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  const printRoot = doc.getElementById("print-root") || doc.createElement("div");
  printRoot.id = "print-root";
  printRoot.innerHTML = html;

  // Ensure the print-root is in the iframe's body
  if (!doc.body.contains(printRoot)) {
    doc.body.appendChild(printRoot);
  }

  // Wait for stylesheets to load
  await new Promise((resolve) => setTimeout(resolve, 150));

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  // Clean up after print
  const cleanup = () => {
    iframe.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
}


const selectivePrint = async (option = "all") => {
  if (option === "all") {
    // Only fetch and build content if we don't already have ALL content
    if (currentPrintContent !== "all") {
      console.log("Current print content:", currentPrintContent);
      console.log("Print-all element:", printAll);

      // Fetch all assignments
      try {
        const response = await fetch(`./assets/json/assignments.json`);
        if (!response.ok) {
          throw new Error(`Failed to fetch assignments: ${response.status}`);
        }
        const assignments = await response.json();
        console.log("Found assignments:", assignments.length);

        // Print all assignments - fetch and combine all
        let allContent = "";
        for (const assignment of assignments) {
          try {
            const htmlResponse = await fetch(`${assignment.slug}.html`);
            if (!htmlResponse.ok) {
              console.warn(
                `Failed to fetch ${assignment.slug}.html: ${htmlResponse.status}`
              );
              continue;
            }
            const htmlText = await htmlResponse.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const mainElement = doc.querySelector("main");
            if (mainElement) {
              mainElement.classList.add(assignment.slug);
              allContent += mainElement.outerHTML;
            } else {
              console.warn(`No main element found in ${assignment.slug}.html`);
            }
          } catch (error) {
            console.error(`Error processing ${assignment.slug}:`, error);
          }
        }

        printAll.innerHTML = allContent;
        currentPrintContent = "all";

        // Wait a moment for DOM to update
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Error loading print content:", error);
        return;
      }
    }
    // Print in isolated iframe with specific stylesheets
    console.log(
      "Print-all content loaded:",
      (printAll.innerHTML || "").length || 0,
      "characters"
    );
    await printHTMLInIsolatedStyles(printAll.innerHTML || "");
  } else if (Array.isArray(option)) {
    // Check if we already have this exact combination
    const optionKey = JSON.stringify(option.sort());
    const currentKey = Array.isArray(currentPrintContent)
      ? JSON.stringify(currentPrintContent.sort())
      : null;

    if (currentKey !== optionKey) {
      // Print specific slugs from array
      let selectedContent = "";
      for (const slug of option) {
        const response = await fetch(`${slug}.html`);
        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const mainElement = doc.querySelector("main");
        mainElement?.classList.add(slug);
        selectedContent += mainElement?.outerHTML || "";
      }
      printAll.innerHTML = selectedContent;
      currentPrintContent = [...option]; // Store copy of array
    }
    window.print();
  } else {
    // Single slug - only fetch if different from current
    if (currentPrintContent !== option) {
      const response = await fetch(`${option}.html`);
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");
      const mainElement = doc.querySelector("main");
      mainElement?.classList.add(option);
      printAll.innerHTML = mainElement?.outerHTML || "";
      currentPrintContent = option;
    }
    window.print();
  }
};
