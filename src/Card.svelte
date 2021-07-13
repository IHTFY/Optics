<script>
  import drawFace from "./drawFace.js";
  import analyzeFace from "./analyzeFace.js";
  import { gameState } from "./stores";
  import { onMount } from "svelte";

  export let played = false;

  let percentages;

  let cardFace;

  onMount(() => {
    const canvas = cardFace;

    drawFace(canvas);

    percentages = analyzeFace(canvas);
  });
</script>

<div class="card" class:played>
  {#if $gameState === "reveal" && played}
    <div id="display">
      <!-- TODO make a pretty display. Overlay or below? -->
      <div>Red: {percentages.red}</div>
      <div>Blue: {percentages.blue}</div>
      <div>Yellow: {percentages.yellow}</div>
      <div>Cyan: {percentages.cyan}</div>
    </div>
  {/if}
  <canvas bind:this={cardFace} width="150px" height="240px" />
</div>

<style>
  .card {
    position: relative;
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

  #display {
    display: table;
    color: #ff3e00;
    background-color: #00000040;

    position: absolute;
    width: 100%;
    font-size: 24px;
    font-weight: 600;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    border-radius: 5%;

    user-select: none;
    overflow: hidden;
  }
</style>
