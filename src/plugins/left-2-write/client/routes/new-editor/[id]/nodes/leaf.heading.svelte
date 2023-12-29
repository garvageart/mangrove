<script lang="ts">
	import { useNodeViewContext } from "@prosemirror-adapter/svelte";
	let tag = "h2";

	const contentRef = useNodeViewContext("contentRef");
	const nodeStore = useNodeViewContext("node");

	$: tag = `h${$nodeStore.attrs.level}`;
</script>

<svelte:element this={tag} use:contentRef />