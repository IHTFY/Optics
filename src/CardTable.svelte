<script>
  import Sortable from "sortablejs";
  import { onMount } from "svelte";
  import Card from "./Card.svelte";

  onMount(() => {
    Sortable.create(cardTable, {
      group: {
        name: "table",
        put: "deck",
        pull: true,
      },
      filter: ".played",
      animation: 150,
    });
  });
</script>

<div id="cardTable">
  <Card played={true} />
</div>

<style>
  #cardTable {
    display: inline-block;
    /* width: 100%; */
  }
</style>
