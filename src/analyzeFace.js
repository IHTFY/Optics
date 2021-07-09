export default function analyzeFace(canvas) {

  const ctx = canvas.getContext('2d');

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const numPixels = canvas.width * canvas.height;
  let redCount = 0;
  let blueCount = 0;
  let yellowCount = 0;
  let cyanCount = 0;

  for (let i = 0; i < numPixels; ++i) {
    // check green channel
    if (imageData.data[i * 4 + 1] === 255) {
      imageData.data[i * 4 + 0] === 255 ? ++yellowCount : ++cyanCount;
    } else {
      if (imageData.data[i * 4 + 0] === 255) {
        ++redCount;
      } else if (imageData.data[i * 4 + 2] === 255) ++blueCount;
    }
  }

  // console.log(redCount, blueCount, yellowCount, cyanCount);

  const toPercent = (x) => Math.round((100 * x) / numPixels);

  return ({
    red: toPercent(redCount),
    blue: toPercent(blueCount),
    yellow: toPercent(yellowCount),
    cyan: toPercent(cyanCount),
  });
}