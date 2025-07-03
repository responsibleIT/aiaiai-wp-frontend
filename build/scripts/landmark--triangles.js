const triangles = document.querySelector(".triangles");





///////////////////
// COLOR LOTTERY //
/////////////////// 

const triangleColorLeftLottery = Math.floor( Math.random() * 5 ) + 1;
const triangleColorRightLottery = Math.floor( Math.random() * 5 ) + 1;

setAttr("data-triangle-color-left-lottery", triangleColorLeftLottery);
setAttr("data-triangle-color-right-lottery", triangleColorRightLottery);





///////////////////
// PATTERN LOTTERY //
/////////////////// 

const trianglePatternLeftLottery = Math.floor( Math.random() * 2 ) + 1;
const trianglePatternRightLottery = Math.floor( Math.random() * 2 ) + 1;

setAttr("data-triangle-pattern-left-lottery", trianglePatternLeftLottery);
setAttr("data-triangle-pattern-right-lottery", trianglePatternRightLottery);





/************************/
/* RESTART AFTER RESIZE */
/************************/

let numberTriangles = getComputedStyle(triangles).getPropertyValue("--number-triangles");


const resizeObserverTriangles = new ResizeObserver(() => {
  let newNumberTriangles = getComputedStyle(triangles).getPropertyValue("--number-triangles");

  if (numberTriangles != newNumberTriangles) {
    numberTriangles = newNumberTriangles;

    triangles.getAnimations().forEach( anim => {
      anim.cancel();
			anim.play();
		});
  }
});

resizeObserverTriangles.observe(triangles);