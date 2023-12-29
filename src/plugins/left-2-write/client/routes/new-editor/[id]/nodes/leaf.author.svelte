<script lang="ts">
	import { afterUpdate, onMount } from "svelte";
	import { useNodeViewContext } from "../editor/leaf.nodeview";
	import { page } from "$app/stores";

	const contentRef = useNodeViewContext("contentRef");
	// const setAttrs = useNodeViewContext("setAttrs");

	// afterUpdate(() => {
	// 	setAttrs({
	// 		class: "hello"
	// 	});
	// });
</script>

<!-- svelte-ignore a11y-missing-content -->
<h3 use:contentRef id="lf-author" contenteditable="false" class="lf-post-metadata">{`By ${$page.data.postData.l2w_author}`}</h3>

<style>
	:global(.lf-post-metadata) {
		font-weight: 500;
		font-size: 0.6em;
		margin-right: 0.5em;
	}
</style>
