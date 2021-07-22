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
  <a style="position: absolute; top: 5px; right: 5px; z-index: 100;" id="gh_link" class="right" href="https://github.com/IHTFY/optics">
    <svg id="gh_logo" height="32" width="32" fill="#ff3e00">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 7.1 4.6 13 11 15 .8 .14 1.1-.34 1.1-.76 0-.38-.02-1.6-.02-3-4 .74-5.1-.98-5.4-1.9-.18-.46-.96-1.9-1.6-2.3-.56-.3-1.4-1-.02-1.1 1.3-.02 2.2 1.2 2.5 1.6 1.4 2.4 3.7 1.7 4.7 1.3 .14-1 .56-1.7 1-2.1-3.6-.4-7.3-1.8-7.3-7.9 0-1.7 .62-3.2 1.6-4.3-.16-.4-.72-2 .16-4.2 0 0 1.3-.42 4.4 1.6 1.3-.36 2.6-.54 4-.54 1.4 0 2.7 .18 4 .54 3.1-2.1 4.4-1.6 4.4-1.6 .88 2.2 .32 3.8 .16 4.2 1 1.1 1.6 2.5 1.6 4.3 0 6.1-3.7 7.5-7.3 7.9 .58 .5 1.1 1.5 1.1 3 0 2.1-.02 3.9-.02 4.4 0 .42 .3 .92 1.1 .76A16 16 0 0 0 32 16c0-8.8-7.2-16-16-16z"></path>
    </svg>
  </a>
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

  #challenge {
    font-size: 1.5em;
    background-color: #ffa50080;
    border-color: #ffa500;
    color: white;
  }
</style>
