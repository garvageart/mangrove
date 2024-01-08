<script lang="ts">
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();
	export const buttonClicked = () => dispatch("buttonClicked");

	export let buttonText: string;
	const initialText: string = buttonText;
	export let buttonAction: string;
	export let mouseOverText: string = "";
	export let showMouseOverText: boolean = mouseOverText ? true : false;
</script>

<button
	on:click={buttonClicked}
	on:mouseenter={() => {
		if (showMouseOverText) {
			buttonText = mouseOverText;
		}
	}}
	on:mouseleave={() => {
		buttonText = initialText;
	}}
	id={`lf-button-${buttonAction.toLowerCase().replaceAll(" ", "-")}`}
	class="lf-button"
	data-action={buttonAction.toLowerCase().replaceAll(" ", "-")}
>
	{buttonText}
</button>

<style>
	.lf-button {
		border-radius: 0px;
		font-family: "Switzer-Variable";
		font-weight: 500;
		font-size: 0.5em;
		color: var(--almost-white);
		background-color: var(--almost-black);
		/* min-width: 10em; */
		width: 12em;
		height: 2.5em;
		margin-top: 1em;
		padding-top: 1em;
		padding-bottom: 1em;
		padding-left: 1em;
		padding-right: 1em;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		cursor: pointer;
	}

	.lf-button:hover {
		background-color: #3f3f3f;
	}
</style>
