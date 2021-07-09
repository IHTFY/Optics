<script>
  import { createEventDispatcher, onMount } from "svelte";

  export let played;

  const dispatch = createEventDispatcher();

  function lockin() {
    played = true;
    dispatch("message", {
      text: "submitted",
    });
  }

  let cardFace;

  onMount(() => {
    const canvas = cardFace;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#F00";
    ctx.fillRect(
      50 * Math.random(),
      50 * Math.random(),
      150 * Math.random(),
      150 * Math.random()
    );

    ctx.fillStyle = "#00F";
    ctx.fillRect(
      50 * Math.random(),
      50 * Math.random(),
      150 * Math.random(),
      150 * Math.random()
    );

    ctx.fillStyle = "#FF0";
    ctx.fillRect(
      50 * Math.random(),
      50 * Math.random(),
      150 * Math.random(),
      150 * Math.random()
    );

    ctx.fillStyle = "#0FF";
    ctx.fillRect(
      50 * Math.random(),
      50 * Math.random(),
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

    // console.log(redCount, blueCount, yellowCount, cyanCount);

    const toPercent = (x) => Math.round((100 * x) / numPixels);
    console.log(
      toPercent(redCount),
      toPercent(blueCount),
      toPercent(yellowCount),
      toPercent(cyanCount)
    );
  });
</script>

<div class="card" class:played>
  <canvas bind:this={cardFace} width="150px" height="240px" />
  {#if !played}
    <button on:click|once={lockin}>✓</button>
  {/if}
</div>

<style>
  .card {
    background-color: #eee;
    display: inline-block;
    width: 150px;
    height: 240px;
    border: 5px solid;
    border-radius: 5%;
    border-color: orange;
    /* overflow: hidden; */
    margin: 5px;
  }

  .played {
    border-color: #ccc;
  }

  button {
    width: 50%;
    background-color: transparent;
    border: none;
    color: white;
    opacity: 0.8;
    position: relative;
  }
</style>
