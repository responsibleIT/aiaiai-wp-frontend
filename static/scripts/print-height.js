const element = document.querySelector(".print-page");
const assigment = document.querySelector(".assignment")

let resizeTimeout;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Run your function here
    console.log('Resize finished');
    assignmentAfterHeight(assigment, element)
  }, 500); // wait 0.5s after resizing stops
});

const assignmentAfterHeight = (main, sibling) => {
    main.style.setProperty('--print-height', `${sibling.offsetHeight}px`);
};

assignmentAfterHeight(assigment, element)
