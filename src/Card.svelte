<script>
  import { onMount } from "svelte";

  let cardFace;

  onMount(() => {
    const canvas = cardFace;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#CCC";
    ctx.fillRect(0, 0, 150, 200);

    ctx.fillStyle = "#F00";
    ctx.fillRect(
      10 * Math.random(),
      10 * Math.random(),
      150 * Math.random(),
      150 * Math.random()
    );

    ctx.fillStyle = "#00F";
    ctx.fillRect(
      20 * Math.random(),
      20 * Math.random(),
      150 * Math.random(),
      150 * Math.random()
    );

    ctx.fillStyle = "#FF0";
    ctx.fillRect(
      30 * Math.random(),
      30 * Math.random(),
      150 * Math.random(),
      150 * Math.random()
    );

    ctx.fillStyle = "#0FF";
    ctx.fillRect(
      40 * Math.random(),
      40 * Math.random(),
      150 * Math.random(),
      150 * Math.random()
    );

    // ctx.strokeStyle = "#FF0";
    // ctx.lineWidth = 4;
    // ctx.beginPath();
    // ctx.arc(75, 75, 50, 0, Math.PI * 2, true); // Outer circle
    // ctx.moveTo(110, 75);
    // ctx.arc(75, 75, 35, 0, Math.PI, false); // Mouth (clockwise)
    // ctx.moveTo(65, 65);
    // ctx.arc(60, 65, 5, 0, Math.PI * 2, true); // Left eye
    // ctx.moveTo(95, 65);
    // ctx.arc(90, 65, 5, 0, Math.PI * 2, true); // Right eye
    // ctx.stroke();

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

    console.log(redCount, blueCount, yellowCount, cyanCount);

    const toPercent = (x) => Math.round((100 * x) / numPixels);
    console.log(
      toPercent(redCount),
      toPercent(blueCount),
      toPercent(yellowCount),
      toPercent(cyanCount)
    );
  });
</script>

<div class="card">
  <canvas bind:this={cardFace} width="150px" height="200px" />
</div>

<style>
  .card {
    display: inline-block;
    width: 150px;
    height: 200px;
    border: 2px solid;
    border-radius: 5%;
  }
</style>
