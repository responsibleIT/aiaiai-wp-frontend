///////////////////////////////////////
// DETAILS--ACCESSIBILITY OPEN/CLOSE //
///////////////////////////////////////

function iniDetailsAccessibility() {
  const detailsAccessibilty = document.querySelector(".details--accessibility");

  function handleKeyDownDetailsAccessibility(e) {
    if (e.key == "Escape") {
      detailsAccessibilty.removeAttribute("open");
    }
  }

  document.addEventListener("keydown", handleKeyDownDetailsAccessibility);
}

// INI DETAILS--ACCESSIBILITY 
iniDetailsAccessibility();





/////////////////////////////////
// DETAILS--ACCESSIBILITY FORM //
/////////////////////////////////

function iniDetailsAccessibilityForm() {
  const detailsAccessibiltyForm = document.querySelector(".details--accessibility form");

  // no submit
  function handleDetailsAccessibiltyFormSubmit(e) {
    e.preventDefault();
  }

  detailsAccessibiltyForm.onsubmit = handleDetailsAccessibiltyFormSubmit;
}

// INI DETAILS--ACCESSIBILITY FORM
iniDetailsAccessibilityForm();





///////////////
// FONT SIZE //
///////////////

function iniFontsize() {
  const fontsizeSelect = $('[name="setting--fontsize"]');
  const fontsizeButtonMin = $('.setting--fontsize--button--min');
  const fontsizeButtonPlus = $('.setting--fontsize--button--plus');


  function setFontsize(fontsizeFactor) {
    setCustProp("--setting-fontsize-factor", fontsizeFactor);
    storeItem("setting-fontsize-factor", fontsizeFactor);
  }


  function handleFontsizeChange(e) {
    setFontsize(e.target.value);
    setFontsizeButtons();
  }


  function handleFontsizeButtonClick(e) {
    if (e.target.value == "min") {
      fontsizeSelect.selectedIndex--;
      fontsizeSelect.dispatchEvent(new Event('change'));
    } 
    else if (e.target.value == "plus") {
      fontsizeSelect.selectedIndex++;
      fontsizeSelect.dispatchEvent(new Event('change'));
    }
  }


  function setFontsizeButtons() {
    if (fontsizeSelect.selectedIndex == 0) {
      fontsizeButtonMin.disabled = true;
      fontsizeButtonPlus.disabled = false;
    }
    else if (fontsizeSelect.selectedIndex == fontsizeSelect.length - 1) {
      fontsizeButtonMin.disabled = false;
      fontsizeButtonPlus.disabled = true;
    }
    else {
      fontsizeButtonPlus.disabled = false;
      fontsizeButtonMin.disabled = false;
    }
  }


  function iniFontsizeInteraction() {
    // if font size select is changed
    fontsizeSelect.onchange = handleFontsizeChange;

    // if font size button is pressed
    fontsizeButtonMin.onclick = handleFontsizeButtonClick;
    fontsizeButtonPlus.onclick = handleFontsizeButtonClick;

    // disable/enable buttons
    setFontsizeButtons();
  }
  
  
  function iniFontsizeValue() {
    let fontsizeFactor = 0;
    const storedFontsizeFactor = retrieveItem("setting-fontsize-factor")
    if( storedFontsizeFactor ) {
      fontsizeFactor = storedFontsizeFactor;
    }
    setFontsize(fontsizeFactor);
    fontsizeSelect.value = fontsizeFactor;
  }


  iniFontsizeValue();
  iniFontsizeInteraction();
}

// INI FONTSIZE
iniFontsize();





//////////////////
// COLOR SCHEME //
//////////////////

function iniColorscheme() {
  const colorSchemeRadios = $$('[name="setting--color-theme"]');


  function setColorScheme(colorScheme) {
    if(colorScheme == "system") {
      if(window.matchMedia('(prefers-color-scheme: light)').matches) {
        setAttr("data-color-scheme", "light");
      } else {
        setAttr("data-color-scheme", "dark");
      }
    } else {
      setAttr("data-color-scheme", colorScheme);
    }
  }
  
  
  function handleColorSchemeChange(e) {
    // value of color scheme radio
    const colorScheme = e.currentTarget.value;
    storeItem("colorScheme", colorScheme);
    setColorScheme(colorScheme);
  }
  

  function iniColorschemeInteraction() {
    // if OS color scheme setting is changed
    window.matchMedia("(prefers-color-scheme: light)").addEventListener('change', () => {
      const colorSchemeRadioValue = $('[name="setting--color-theme"]:checked').value;
      if(colorSchemeRadioValue == "system") {
        setColorScheme("system");
      }
    });

    // if color scheme radio is selected
    colorSchemeRadios.forEach(colorSchemeRadio => {
      colorSchemeRadio.onchange = handleColorSchemeChange;
    });
  }
  

  function iniColorschemeValue() {
    // default
    let colorScheme = "system";
  
     // if in local storage
    const storedColorScheme = retrieveItem("colorScheme");
    if(storedColorScheme) {
      colorScheme = storedColorScheme;
      // set color scheme radio button
      $(`[name="setting--color-theme"][value="${storedColorScheme}"]`).checked = true;
    }
  
    setColorScheme(colorScheme);
  }


  iniColorschemeValue();
  iniColorschemeInteraction();
}

// INI COLOR SCHEME
iniColorscheme();





////////////////////
// REDUCED MOTION //
////////////////////

function iniReducedMotion() {
  const reducedMotionRadios = $$('[name="setting--motion"]');


  function setReducedMotion(reducedMotion) {
    if(reducedMotion == "system") {
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setAttr("data-reduced-motion", "reduce");
      } else {
        setAttr("data-reduced-motion", "no-preference");
      }
    } else {
      setAttr("data-reduced-motion", reducedMotion);
    }
  }
  
  
  function handleReducedMotionChange(e) {
    // value of reduced motion radio
    const reducedMotion = e.currentTarget.value;
    storeItem("reducedMotion", reducedMotion);
    setReducedMotion(reducedMotion);
  }


  function iniReducedMotionInteraction() {
    // if OS color scheme setting is changed
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener('change', () => {
      const reducedMotionRadioValue = $('[name="setting--motion"]:checked').value;
      if(reducedMotionRadioValue == "system") {
        setReducedMotion("system");
      }
    });

    // if font family radio is selected
    reducedMotionRadios.forEach(reducedMotionRadio => {
      reducedMotionRadio.onchange = handleReducedMotionChange;
    });
  }
  
  
  function iniReducedMotionValue() {
    // default
    let reducedMotion = "system";
  
    // if in local storage
    const storedReducedMotion = retrieveItem("reducedMotion");
    if(storedReducedMotion) {
      reducedMotion = storedReducedMotion;
      // set reduced motion radio button
      $(`[name="setting--motion"][value="${storedReducedMotion}"]`).checked = true;
    }
  
    setReducedMotion(reducedMotion);
  }

  iniReducedMotionValue();
  iniReducedMotionInteraction();
}

// INI
iniReducedMotion();





////////////////////////////////
// CHECKBOXES - ACCESSIBILITY //
////////////////////////////////

function iniCheckboxesAccessibility() {
  const checkboxesAccessibility = $$('.details--accessibility [type="checkbox"]');

  function iniCheckboxAccessibility(checkboxAccessibility) {
    const setting = checkboxAccessibility.name;
    // default
    let value = checkboxAccessibility.checked;

    const storedValue = retrieveItem(setting);
    if(storedValue) {
      value = storedValue;
    }

    checkboxAccessibility.checked = value;
    setAttr("data-"+setting, value);
  }

  function updateCheckboxAccessibility(e) {
    const setting =  e.currentTarget.name;
    const value = e.currentTarget.checked;

    setAttr("data-"+setting, value);
    storeItem(setting, value);
  }

  checkboxesAccessibility.forEach(checkboxAccessibility => {
    iniCheckboxAccessibility(checkboxAccessibility);
    checkboxAccessibility.onchange = updateCheckboxAccessibility;
  });
}

// INI CHECKBOXES - ACCESSIBILITY
iniCheckboxesAccessibility();