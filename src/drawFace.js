const RED = "#F00";
const BLUE = "#00F";
const YELLOW = "#FF0";
const CYAN = "#0FF";

const COLORS = [RED, BLUE, YELLOW, CYAN];

const ri = a => a[Math.floor(Math.random() * a.length)];

function rc() {
  return ri(COLORS);
}

function rand(range, offset = 0) {
  return Math.random() * range + offset;
}

function shuffle(a) {
  for (let i = 0; i < a.length - 1; i++) {
    let j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function drawFace(canvas) {
  const ctx = canvas.getContext("2d");

  function rect(color, x, y, w, h, a) {
    ctx.fillStyle = color;
    ctx.translate(x, y)
    ctx.rotate(a);
    ctx.fillRect(0, 0, w, h);
    ctx.resetTransform();
  }

  function smiley(color, x, y, r, a = 0) {
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

  function heart(color, x, y, w, h, a = 0) {

    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.scale(w / 10.944, h / 10.88);

    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(10, -3, 4, -8, 0, -5);
    ctx.bezierCurveTo(-4, -8, -10, -3, 0, 5);

    ctx.fill();
    ctx.resetTransform();
  }


  let tmp = shuffle(COLORS);
  for (let i = 0; i < 4; i++) {
    heart(tmp[i], 75, 130, 140 - 20 * i, 200 - 20 * i, 0);
  }

  for (let c of shuffle(COLORS)) {
    rect(c, rand(200), rand(300), rand(100, 20), rand(100, 20), rand(2 * Math.PI));
  }

  // rect(rc(), rand(200), rand(300), rand(100, 20), rand(100, 20), rand(2 * Math.PI));
  // heart(rc(), 100, 150, 100, 50, 0);


  // rect(RED, 0, 0, 100, 100);

  // smiley(CYAN, 35, 25, 30, 0);
  // smiley(BLUE, 35, 25, 50, 0);
  // smiley(RED, 35, 25, 70, 0);
  // smiley(YELLOW, 35, 25, 90, 0);

  // heart(BLUE);

}