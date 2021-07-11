<script>
  import { createEventDispatcher, onMount } from "svelte";
  import drawFace from "./drawFace.js";
  import analyzeFace from "./analyzeFace.js";
  import { gameState } from "./stores";

  export let played;

  let percentages;

  const dispatch = createEventDispatcher();

  function lockin() {
    played = true;
    dispatch("lockedIn");
  }

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
      {JSON.stringify(percentages)}
    </div>
  {/if}

  <canvas bind:this={cardFace} width="150px" height="240px" />
  {#if !played}
    <button on:click|once={lockin}>✓</button>
  {/if}
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
    color: black;
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  button {
    z-index: 1;
    font-size: 40px;
    width: 100%;
    padding: 0;
    margin: 0;
    background-color: transparent;
    border: none;
    color: white;
    opacity: 0.8;
    position: relative;
  }
</style>
