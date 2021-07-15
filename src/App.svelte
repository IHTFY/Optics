<script>
  import { onMount } from "svelte";

  import CardDeck from "./CardDeck.svelte";
  import CardTable from "./CardTable.svelte";
  import ColorCard from "./ColorCard.svelte";
  import { gameState, currentColor } from "./stores";

  function handleChallenge() {
    const challengeButton = document.getElementById("challenge");
    if (challengeButton.textContent === "Challenge") {
      const uncommitted = document.querySelector(
        "#cardTable > .card:not(.played)"
      );
      if (uncommitted) {
        document.getElementById("newCard").appendChild(uncommitted);
      }
      gameState.set("reveal");
      challengeButton.textContent = "Clear Table";
    } else {
      gameState.set("");
      challengeButton.textContent = "Challenge";
      document
        .querySelectorAll("#cardTable > .played")
        .forEach((c) => c.remove());
      const nextCard = document.querySelector("#newCard > .card");
      document.getElementById("cardTable").appendChild(nextCard);
      document.querySelector("#newDeck > span").click();

      currentColor.set(
        ["red", "blue", "yellow", "cyan"][Math.floor(Math.random() * 4)]
      );
    }
  }

  $: $currentColor, () => console.log($currentColor);
</script>

<main>
  <h1>Optics</h1>
  <button id="challenge" on:click={handleChallenge}>Challenge</button>
  <CardDeck />
  <div>
    <ColorCard />
    <CardTable />
  </div>
</main>

<style>
  main {
    color: white;
    text-align: center;
    align-items: center;
    padding: 1em;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }
</style>
