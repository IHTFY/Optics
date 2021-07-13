<script>
  import CardDeck from "./CardDeck.svelte";
  import CardTable from "./CardTable.svelte";
  import { gameState } from "./stores";

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
    }
  }
</script>

<main>
  <h1>Eyeball</h1>
  <button id="challenge" on:click={handleChallenge}>Challenge</button>
  <CardDeck />
  <CardTable />
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
