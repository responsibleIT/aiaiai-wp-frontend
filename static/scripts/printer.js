// Print container
const printAll = document.querySelector(".print-all");

// Track what content is currently loaded
let currentPrintContent = null; // 'all', ['slug1', 'slug2'], 'single-slug', or null

// Print listener
const printButton = document.querySelector(".assignment button");
printButton.addEventListener("click", () => {
  currentMain.classList.remove("no-print");
  printAll.classList.add("no-print");

  window.print();
});

const currentMain = document.querySelector("main#main");

// Print all listener
const printAllButton = document.querySelector("[data-type=printAll]");
printAllButton.addEventListener("click", () => {
  printAll.classList.remove("no-print");
  currentMain.classList.add("no-print");

  // Default is print all
  selectivePrint();
});

const selectivePrint = async (option = "all") => {
  if (option === "all") {
    // Only fetch and build content if we don't already have ALL content
    if (currentPrintContent !== "all") {
      console.log(currentPrintContent);
      // Fetch all assignments
      const response = await fetch(`./assets/json/assignments.json`);
      const assignments = await response.json();

      // Print all assignments - fetch and combine all
      let allContent = "";
      for (const assignment of assignments) {
        const htmlResponse = await fetch(`${assignment.slug}.html`);
        const htmlText = await htmlResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const mainElement = doc.querySelector("main");
        mainElement?.classList.add(assignment.slug);
        allContent += mainElement?.outerHTML || "";
      }
      printAll.innerHTML = allContent;
      currentPrintContent = "all";
    }
    window.print();
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
