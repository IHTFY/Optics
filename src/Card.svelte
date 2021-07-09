<script>
  import { createEventDispatcher, onMount } from "svelte";
  import drawFace from "./drawFace.js"
  import analyzeFace from "./analyzeFace.js";

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

    drawFace(canvas);

    let percentages = analyzeFace(canvas);
    console.log(percentages);
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
