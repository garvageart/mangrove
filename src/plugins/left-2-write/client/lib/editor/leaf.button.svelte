<script>
	import { createEventDispatcher, onMount,  } from "svelte";
	const buttonEvent = createEventDispatcher();
	export const buttonClicked = () => buttonEvent("buttonClicked");

	export let buttonText;
	export let buttonAction;
	export let mouseOverText;
	export let showMouseOverText;

	if (showMouseOverText) {
		onMount(() => {
			const button = document.getElementById("lf-button");

			button.onmouseover = () => (button.innerText = mouseOverText);
			button.onmouseout = () => (button.innerText = buttonText);
		});
	}
</script>

<button on:click={buttonClicked} id="lf-button" data-action={buttonAction}>
	{buttonText}</button
>

<style>
	#lf-button {
		border-radius: 0px;
		font-family: "Switzer";
		font-weight: 500;
		font-size: 0.5em;
		color: var(--almost-white);
		background-color: var(--almost-black);
		min-width: 6em;
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

	#lf-button:hover {
		background-color: #292929;
	}
</style>
