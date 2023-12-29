<script lang="ts">
	import { onDestroy, onMount, beforeUpdate, afterUpdate } from "svelte";
	import { useNodeViewContext } from "../editor/leaf.nodeview";
	import { dev } from "$app/environment";

	const contentRef = useNodeViewContext("contentRef");

	if (dev) {
		beforeUpdate(() => {
			console.log("mounting body");
		});

		onMount(() => {
			console.log("body mounted");
		});

		afterUpdate(() => {
			console.log("an update has occured");
		});

		onDestroy(() => {
			console.log("the component is being destroyed");
		});
	}
</script>

<article use:contentRef id="lf-body" />

<style>
	#lf-body {
		font-size: 0.6em;
		border: 0px solid #ccc;
	}
</style>
