<script>
  import Sortable from "sortablejs";
  import { onMount, mount } from "svelte";

  import Card from "./Card.svelte";

  let nextCardProps;

  function mountNextCard() {
    const props = $state({ played: false });
    nextCardProps = props;
    mount(Card, { target: document.getElementById("newCard"), props });
  }

  function addNewCard() {
    nextCardProps.played = true;
    mountNextCard();
  }

  onMount(() => {
    Sortable.create(document.getElementById("newCard"), {
      group: {
        name: "deck",
        put: "table",
        pull: "table",
      },
      animation: 150,
    });
    mountNextCard();
  });
</script>

<div id="newDeck">
  <span onclick={addNewCard}>✓</span>
  <div id="newCard"></div>
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
