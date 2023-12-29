<script lang="ts">
	import { useNodeViewContext } from "../editor/leaf.nodeview";

	const contentRef = useNodeViewContext("contentRef");
</script>

<!-- svelte-ignore a11y-missing-content -->
<svelte:element this={"summary"} use:contentRef id="lf-summary" />

<style>
	:global(#lf-summary > h2) {
		margin-bottom: 0.5em;
		font-size: 0.8em;
		font-weight: 500;
	}
</style>
