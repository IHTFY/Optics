<script>
  import Card from "./Card.svelte";
  import Sortable from "sortablejs";
  import { onMount } from "svelte";

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
    });
    theNextCard.$on("message", addNewCard);
  }

  export let name;
</script>

<main>
  <h1>Hello {name}!</h1>
  <h1>Eyeball</h1>
  <button id="challenge">Challenge</button>
  <div id="newCard">
    <Card on:message={addNewCard} />
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
