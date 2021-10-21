// Define colors
const RED = "#F00";
const BLUE = "#00F";
const YELLOW = "#FF0";
const CYAN = "#0FF";

const COLORS = [RED, BLUE, YELLOW, CYAN];

// Utilities: Randomization
const ri = a => a[Math.floor(Math.random() * a.length)];

const rc = () => ri(COLORS);

const rand = (range, offset = 0) => Math.random() * range + offset;

const shuffle = a => {
  for (let i = 0; i < a.length - 1; i++) {
    let j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// Drawing methods
function rect(ctx, color, x, y, w, h, a = 0) {
  ctx.fillStyle = color;
  ctx.translate(x, y)
  ctx.rotate(a);
  ctx.fillRect(0, 0, w, h);
  ctx.resetTransform();
}

function tri(ctx, color, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
}

function smiley(ctx, color, x, y, r) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.2 * r;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, true); // Outer circle
  ctx.moveTo(x + 0.7 * r, y);
  ctx.arc(x, y, 0.7 * r, 0, Math.PI, false); // Mouth (clockwise)
  ctx.moveTo(x - 0.2 * r, y - 0.2 * r);
  ctx.arc(x - 0.3 * r, y - 0.2 * r, 0.1 * r, 0, Math.PI * 2, true); // Left eye
  ctx.moveTo(x + 0.4 * r, y - 0.2 * r);
  ctx.arc(x + 0.3 * r, y - 0.2 * r, 0.1 * r, 0, Math.PI * 2, true); // Right eye
  ctx.stroke();
}

function heart(ctx, color, x, y, w, h, a = 0) {
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(w / 10.944, h / 10.88);

  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(10, -3, 4, -8, 0, -5);
  ctx.bezierCurveTo(-4, -8, -10, -3, 0, 5);

  ctx.fillStyle = color;
  ctx.fill();

  ctx.resetTransform();
}

function cir(ctx, color, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, true); // Outer circle
  ctx.fillStyle = color;
  ctx.fill();
}

function randomShapes(ctx, shape = ri(["rect", "heart", "tri", "cir", "smile"])) {
  switch (shape) {
    case "rect":
      for (let c of shuffle(COLORS)) {
        rect(ctx, c, rand(150), rand(240), rand(100, 10), rand(100, 10), rand(2 * Math.PI));
      }
      break;
    case "heart":
      let tmp = shuffle(COLORS);
      let tmp2 = ri([0, 0, 0, 0.1, -0.1]);
      for (let i = 0; i < 4; i++) {
        heart(ctx, tmp[i], 75, 130, 140 - 20 * i, 200 - 30 * i, tmp2 * i);
      }
      break;
    case "tri":
      for (let c of shuffle(COLORS)) {
        tri(ctx, c, rand(150), rand(240), rand(150), rand(240), rand(150), rand(240));
      }
      break;

    case "cir":
      for (let c of shuffle(COLORS)) {
        cir(ctx, c, rand(150), rand(240), rand(70, 5));
      }
      break;

    case "smile":
      for (let c of shuffle(COLORS)) {
        smiley(ctx, c, rand(150), rand(240), rand(50, 10));
      }
      break;
    default:
      break;
  }
}


export default function drawFace(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  randomShapes(ctx);
  randomShapes(ctx);
}