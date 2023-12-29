<svelte:options accessors />

<script>
	import { beforeUpdate, onMount } from "svelte";
	import { useNodeViewContext } from "../editor/leaf.nodeview";
	import { dev } from "$app/environment";

	const contentRef = useNodeViewContext("contentRef");

	if (dev) {
		beforeUpdate(() => {
			console.log("mounting editor header component");
		});

		onMount(() => {
			console.log("editor header mounted");
		});
	}
</script>

<div use:contentRef id="lf-header" />

<style>
	#lf-header {
		border-bottom: 1px solid #ccc;
		max-width: 100%;
		overflow: clip;
		padding: 2em 0in 0.5em 0in;
	}

	:global(.lf-post-metadata > h3) {
		margin-bottom: 0px;
		font-size: 0.5em;
		margin-right: 0.5em;
	}
</style>
