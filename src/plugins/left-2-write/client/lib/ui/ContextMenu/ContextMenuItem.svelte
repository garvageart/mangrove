<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { ILeft2WriteMenuOptions } from "../../../../../../types/plugins/l2w.types";

	export let disabled = false;
	export let options: ILeft2WriteMenuOptions;

	const dispatch = createEventDispatcher();
	const handleClick = () => {
		if (disabled) return;

		dispatch("itemclick");
	};
</script>

<li>
	<button class:disabled on:click={handleClick}>
		{options.itemName}
	</button>
</li>

<style>
	li {
		display: flex;
		list-style-type: none;
		width: 100%;
		height: 1.3em;
	}

	li button:hover {
		background-color: #3f3f3f;
	}

	li > button {
		font-size: 0.6em;
		font-weight: 500;
		font-family: "Switzer-Variable";
		padding: 0.3em 0.5em;
		text-align: left;
		width: 100%;
		border: 0px;
		color: var(--almost-white);
		background-color: var(--almost-black);
		cursor: pointer;
	}

	li > button.disabled {
		color: #4f4f4f;
	}

	li > button.disabled:hover {
		background-color: #4a4a4a;
		cursor: none;
	}

	/* :global(li button.info:hover) {
		color: navy;
	} */
</style>
