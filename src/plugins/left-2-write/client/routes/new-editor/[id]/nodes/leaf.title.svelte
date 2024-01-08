<script lang="ts">
	// import { useNodeViewContext } from "@prosemirror-adapter/svelte";
	import { onMount } from "svelte";
	import { useNodeViewContext } from "../editor/leaf.nodeview";

	const contentRef = useNodeViewContext("contentRef");

	onMount(() => {
		// setAttrs({
		// 	"data-placeholder": "sssss"
		// })
	});
</script>

<!-- svelte-ignore a11y-missing-content -->
<h1 use:contentRef id="lf-title" />

<style>
	#lf-title {
		border: 0px;
		margin-bottom: 0.3em;
		font-size: 1.5em;
		font-weight: 700;
		line-height: 110%;
		font-family: "Switzer-Variable";
		display: flex;
		justify-content: left;
		align-items: center;
		text-align: left;
		width: 100%;
		max-width: 100%;
		resize: none;
		height: auto;
		outline: none;
	}

	#lf-title:focus {
		outline-width: 0;
	}
</style>
