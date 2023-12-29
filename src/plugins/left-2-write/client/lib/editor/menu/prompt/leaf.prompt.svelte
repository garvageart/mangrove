<script lang="ts">
	import { dev } from "$app/environment";
	import { onDestroy, onMount } from "svelte";

	export let promptTitle: string = null;

	const PROMPT_WIDTH = 450;
	let promptElement: HTMLDivElement;

	function bound(node: HTMLDivElement) {
		const box = node.getBoundingClientRect();

		node.style.width = PROMPT_WIDTH + "px";
		node.style.top = box.top - box.bottom - 15 + "px";
		node.style.left = -PROMPT_WIDTH + 450 + "px";
	}

	if (dev) {
		onMount(() => {
			console.log("mounting prompt");
		});

		onDestroy(() => {
			console.log("destroying prompt");
		});
	}
</script>

<div bind:this={promptElement} use:bound class="lf-prompt unselectable">
	<h4 class="lf-prompt-title">{promptTitle}</h4>
	<slot name="contents" />
</div>

<style>
	.lf-prompt-title {
		font-size: 0.7em;
		margin-bottom: 0.5em;
	}

	.lf-prompt {
		display: flex;
		flex-direction: column;
		justify-content: left;
		padding: 0.5em 1em;
		background-color: var(--almost-white);
		box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.5);
		position: absolute;
	}
</style>
