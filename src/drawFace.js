const RED = "#F00";
const BLUE = "#00F";
const YELLOW = "#FF0";
const CYAN = "#0FF";

function rc() {
  return [RED, BLUE, YELLOW, CYAN][Math.floor(Math.random() * 4)];
}

function rand(range, offset = 0) {
  return Math.random() * range + offset;
}

export default function drawFace(canvas) {
  const ctx = canvas.getContext("2d");

  function rect(color, x, y, w, h, a) {
    ctx.fillStyle = color;
    ctx.translate(x, y)
    ctx.rotate(a);
    ctx.fillRect(0, 0, w, h);
    ctx.rotate(-a);
    ctx.translate(-x, -y);
  }

  function smiley(color, x, y, r, a) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.2 * r;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, true); // Outer circle
    ctx.moveTo(x + 0.7 * r, y);
    ctx.arc(x, y, 0.7 * r, a, Math.PI, false); // Mouth (clockwise)
    ctx.moveTo(x - 0.2 * r, y - 0.2 * r);
    ctx.arc(x - 0.3 * r, y - 0.2 * r, 0.1 * r, 0, Math.PI * 2, true); // Left eye
    ctx.moveTo(x + 0.4 * r, y - 0.2 * r);
    ctx.arc(x + 0.3 * r, y - 0.2 * r, 0.1 * r, 0, Math.PI * 2, true); // Right eye
    ctx.stroke();
  }

  function heart(color, x, y, w, h, a) {
    ctx.fillStyle = color;
    ctx.beginPath();
    // TODO find params in terms of x,y,w,h,a
    ctx.moveTo(75, 40);
    ctx.bezierCurveTo(75, 37, 70, 25, 50, 25);
    ctx.bezierCurveTo(20, 25, 20, 62.5, 20, 62.5);
    ctx.bezierCurveTo(20, 80, 40, 102, 75, 120);
    ctx.bezierCurveTo(110, 102, 130, 80, 130, 62.5);
    ctx.bezierCurveTo(130, 62.5, 130, 25, 100, 25);
    ctx.bezierCurveTo(85, 25, 75, 37, 75, 40);
    ctx.fill();
  }

  for (let c of [RED, BLUE, YELLOW, CYAN]) {
    rect(c, rand(200), rand(300), rand(100, 20), rand(100, 20), rand(2 * Math.PI));
  }

  rect(rc(), rand(200), rand(300), rand(100, 20), rand(100, 20), rand(2 * Math.PI));


  // rect(RED, 0, 0, 100, 100);

  // smiley(CYAN, 35, 25, 30, 0);
  // smiley(BLUE, 35, 25, 50, 0);
  // smiley(RED, 35, 25, 70, 0);
  // smiley(YELLOW, 35, 25, 90, 0);

  // heart(BLUE);

}