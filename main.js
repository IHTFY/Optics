const canvas = document.getElementById('currentCard');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#FF0000';
ctx.fillRect(10, 10, 50, 50);

ctx.fillStyle = '#0000FF';
ctx.fillRect(20, 20, 50, 50);

ctx.fillStyle = '#FFFF00';
ctx.fillRect(30, 30, 50, 50);

ctx.fillStyle = '#00FFFF';
ctx.fillRect(40, 40, 50, 50);

ctx.strokeStyle = '#FFFF00';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.arc(75, 75, 50, 0, Math.PI * 2, true); // Outer circle
ctx.moveTo(110, 75);
ctx.arc(75, 75, 35, 0, Math.PI, false);  // Mouth (clockwise)
ctx.moveTo(65, 65);
ctx.arc(60, 65, 5, 0, Math.PI * 2, true);  // Left eye
ctx.moveTo(95, 65);
ctx.arc(90, 65, 5, 0, Math.PI * 2, true);  // Right eye
ctx.stroke();


let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const numPixels = canvas.width * canvas.height;
let redCount = 0;
let blueCount = 0;
let yellowCount = 0;
let cyanCount = 0;

for (let i = 0; i < numPixels; ++i) {
  // check green channel
  if (imageData.data[i * 4 + 1]) {
    imageData.data[i * 4 + 0] ? ++yellowCount : ++cyanCount;
  } else {
    if (imageData.data[i * 4 + 0]) {
      ++redCount;
    } else if (imageData.data[i * 4 + 2]) ++blueCount;
  }
}

console.log(redCount, blueCount, yellowCount, cyanCount);

const toPercent = x => Math.round(100 * x / numPixels);
console.log(toPercent(redCount), toPercent(blueCount), toPercent(yellowCount), toPercent(cyanCount));