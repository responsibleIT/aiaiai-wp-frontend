// Print container
const printAll = document.querySelector(".print-all");

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
    // Fetch all assignments
    const response = await fetch(`./assignments.json`);
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
    window.print();
  } else if (Array.isArray(option)) {
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
    window.print();
  } else {
    // Single slug
    const response = await fetch(`${option}.html`);
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const mainElement = doc.querySelector("main");
    mainElement?.classList.add(option);
    printAll.innerHTML = mainElement?.outerHTML || "";
    window.print();
  }
};
