export default function analyzeFace(canvas) {

  const ctx = canvas.getContext('2d');

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const numPixels = canvas.width * canvas.height;
  let redCount = 0;
  let blueCount = 0;
  let yellowCount = 0;
  let cyanCount = 0;

  // function realiasing(ctx) {
  //   const imageData = ctx.getImageData(0, 0, 150, 240);
  //   const data = imageData.data;
  //   for (let i = 0; i < data.length; i++) {
  //     data[i] = data[i] > 127 ? 255 : 0
  //   }
  //   ctx.putImageData(imageData, 0, 0);
  // }

  for (let i = 0; i < numPixels; ++i) {
    // check green channel
    if (imageData.data[i * 4 + 1] > 127) {
      imageData.data[i * 4 + 0] > 127 ? ++yellowCount : ++cyanCount;
    } else {
      if (imageData.data[i * 4 + 0] > 127) {
        ++redCount;
      } else if (imageData.data[i * 4 + 2] > 127) ++blueCount;
    }
  }

  // console.log(redCount, blueCount, yellowCount, cyanCount, redCount + blueCount + yellowCount + cyanCount);

  const toPercent = (x) => Math.round((100 * x) / numPixels);

  return ({
    red: toPercent(redCount),
    blue: toPercent(blueCount),
    yellow: toPercent(yellowCount),
    cyan: toPercent(cyanCount),
  });
}