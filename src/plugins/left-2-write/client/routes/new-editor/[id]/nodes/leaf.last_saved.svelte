<script lang="ts">
	import { afterUpdate, onMount } from "svelte";
	import { useNodeViewContext } from "../editor/leaf.nodeview";
	import { convertDate } from "../../../../../l2w.util";
	import { page } from "$app/stores";
	import { lastSavedAt } from "left-2-write/lib/stores/editor";
	import { DateTime } from "luxon";

	const contentRef = useNodeViewContext("contentRef");
	// const setAttrs = useNodeViewContext("setAttrs");

	// afterUpdate(() => {
	// 	setAttrs({
	// 		class: "hello"
	// 	});
	// });
</script>

<!-- svelte-ignore a11y-missing-content -->
<h3 use:contentRef id="lf-last_saved" contenteditable="false" class="lf-post-metadata">
	{DateTime.fromJSDate(new Date($lastSavedAt)).toFormat("DDDD — T")}
</h3>

<style>
	#lf-last_saved {
		font-weight: 400;
		color: #696969;
	}
</style>
