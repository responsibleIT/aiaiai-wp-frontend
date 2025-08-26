const list = document.querySelector(".post-links");
const linkList = list.querySelectorAll("a[href^='#']");

let previouslyClicked;
linkList.forEach((link) => {
  link.addEventListener("click", (e) => {
    previouslyClicked && (previouslyClicked.dataset.selected = "false");
    e.target.dataset.selected = "true";
    previouslyClicked = e.target;
  });
});