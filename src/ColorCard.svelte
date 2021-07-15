<script>
  import { onMount } from "svelte";
  import { currentColor } from "./stores";

  let canvas;

  onMount(() => {
    function drawArrow(color) {
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 5;
      ctx.fillStyle = $currentColor;
      ctx.beginPath();
      ctx.moveTo(235, 75);
      ctx.lineTo(140, 145);
      ctx.lineTo(160, 95);
      ctx.lineTo(5, 100);
      ctx.lineTo(5, 50);
      ctx.lineTo(160, 55);
      ctx.lineTo(140, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    currentColor.subscribe(() => {
      drawArrow($currentColor);
    });
  });
</script>

<div><canvas bind:this={canvas} width="240px" height="150px" /></div>

<style>
  div {
    position: relative;
    background-color: #999;
    display: inline-block;
    width: 240px;
    height: 150px;
    border: 5px solid;
    border-color: #ccc;
    border-radius: 5%;
  }
</style>
