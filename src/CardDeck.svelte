<script>
  import Sortable from "sortablejs";
  import { onMount } from "svelte";

  import Card from "./Card.svelte";

  let theNextCard;
  let played;

  function addNewCard() {
    theNextCard.$set({ played: true });

    theNextCard = new Card({
      target: document.getElementById("newCard"),
      props: {
        played: false,
      },
    });
  }

  onMount(() => {
    Sortable.create(newCard, {
      group: {
        name: "deck",
        put: "table",
        pull: "table",
      },
      animation: 150,
    });
  });
</script>

<div id="newDeck">
  <span on:click={addNewCard}>✓</span>
  <div id="newCard">
    <Card bind:played bind:this={theNextCard} />
  </div>
</div>

<style>
  span {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    user-select: none;

    font-size: 5em;
    background-color: transparent;
    border: none;
    color: white;
    opacity: 1;
  }

  #newDeck {
    position: relative;
    margin: 0 auto;
    padding: 45px 5px;
    width: 240px;
    min-height: 260px;
    border-radius: 5%;
    background-color: #ffa50030;
  }

  #newCard {
    width: 100%;
    min-height: 240px;
  }
</style>
