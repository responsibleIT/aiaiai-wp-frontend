const items = $$("[name=weergave]");
const list = $("[data-display]")
// Check for has support; in case it is not supported we fallback to js
const hasSupport = CSS.supports("selector(:has(*))");
let initialItem;

console.log(hasSupport);
items.forEach((item) => {
  item.addEventListener("change", (e) => {
    console.log(e.target, initialItem);
    
    storeItem("view", e.target.value);
    list.dataset.display = retrieveItem("view");
    if (!hasSupport) {        
      initialItem.parentElement.classList.toggle("selected");
      initialItem = e.target;
      initialItem.parentElement.classList.toggle("selected");
    }
  });
});

const initialView = () => {
  const currentView = retrieveItem("view");
  initialItem = Array.from(items).find((item) => item.value === currentView);
    console.log(initialItem);
    
  // If no item is set yet, set the first value we find; as that is the default view
  if (!initialItem) {
    storeItem("view", items[0].value);
    initialItem = items[0];
  }

  if (!hasSupport) {
    initialItem.parentElement.classList.add("selected");
  } else {
    initialItem.checked = true;
    console.log(initialItem, "selected");
  }
};

initialView();
