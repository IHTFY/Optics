<script>
  import Card from "./Card.svelte";
  import Sortable from "sortablejs";
  import { onMount } from "svelte";
  import { gameState } from "./stores";

  onMount(() => {
    Sortable.create(newCard, {
      group: {
        name: "deck",
        put: false,
        pull: "table",
      },
      animation: 200,
    });

    Sortable.create(cardTable, {
      group: {
        name: "table",
        put: "deck",
        pull: false,
      },
      filter: ".played",
      animation: 200,
    });
  });

  function addNewCard() {
    const theNextCard = new Card({
      target: document.getElementById("newCard"),
      props: {
        played: false,
      },
    });
    theNextCard.$on("lockedIn", addNewCard);
  }

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
      nextCard.querySelector("button").click();
    }
  }
</script>

<main>
  <h1>Eyeball</h1>
  <button id="challenge" on:click={handleChallenge}>Challenge</button>
  <div id="newCard">
    <Card on:lockedIn={addNewCard} played={false} />
  </div>
  <div id="cardTable">
    <Card played={true} />
  </div>
</main>

<style>
  main {
    color: white;
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
