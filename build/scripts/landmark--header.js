///////////////////////
// MENU - OPEN/CLOSE //
///////////////////////

function iniMenu() {
  const buttonMenu = document.querySelector(".button--menu");
  const header = document.querySelector("body > header");


  // menu button
  function handleButtonMenuClick() {
    header.classList.toggle("is-open");
  }

  buttonMenu.onclick = handleButtonMenuClick;


  // menu escape
  function handleKeyDownMenu(e) {
    if (e.key == "Escape") {
      header.classList.remove("is-open");
    }
  }

  document.addEventListener("keydown", handleKeyDownMenu);
}


// INI MENU 
iniMenu();