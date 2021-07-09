<script>
  import Card from "./Card.svelte";
  import Sortable from "sortablejs";
  import { onMount } from "svelte";

  onMount(() => {
    Sortable.create(playedCards, { animation: 200 });
  });

  export let name;
</script>

<main>
  <h1>Hello {name}!</h1>
  <h1>Eyeball</h1>
  <div id="playedCards">
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
    <Card />
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
