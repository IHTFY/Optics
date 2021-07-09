import { writable } from 'svelte/store';
export let nextCard = writable({});
export let playedCards = writable({});