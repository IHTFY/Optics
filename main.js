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