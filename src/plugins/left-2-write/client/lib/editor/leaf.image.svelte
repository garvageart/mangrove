<script lang="ts">
	import { objectToAttrs } from "left-2-write/routes/new-editor/[id]/leaf.utils";
	import type { Attrs } from "prosemirror-model";
	import type { EditorView } from "prosemirror-view";
	import { getContext, onMount } from "svelte";
	import { editorView } from "../stores/editor";

	let imageElement: HTMLImageElement;
	export let src: string;
	export let alt: string;
	export let nodeAttrs: Attrs;

	// Please rewrite this whole thing using components instead of whatever this shit is
	function openImageViewer(
		event:
			| (MouseEvent & { currentTarget: EventTarget & HTMLImageElement })
			| (KeyboardEvent & { currentTarget: EventTarget & HTMLImageElement })
	) {
		const imgViewer = document.getElementById("lf-full_screen-modal");
		const image = event.target as HTMLImageElement;
		const imageCloned = image.cloneNode() as HTMLImageElement;
		imageCloned.style.maxHeight = "90%";
		imageCloned.style.width = "auto";

		imgViewer.prepend(imageCloned);
		imgViewer.style.display = "flex";

		imgViewer.focus();
		$editorView.dom.blur();
	}

	onMount(() => objectToAttrs(imageElement, nodeAttrs));
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<img bind:this={imageElement} class="lf-img-editor-img" {src} {alt} on:click={openImageViewer} on:keydown={openImageViewer} />

<style>
	.lf-img-editor-img {
		margin: auto;
		display: block;
		width: 100%;
		max-height: 540px;
		overflow: hidden;
		object-fit: cover;
		cursor: zoom-in;
	}
</style>
