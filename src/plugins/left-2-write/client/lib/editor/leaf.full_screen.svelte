<script lang="ts">
	import { editorView, showFullscreen } from "../stores/editor";

	export let modalContent: HTMLElement = null;

	let fullPageEl: HTMLDivElement;

	function closeImageViewer(event: MouseEvent | KeyboardEvent) {
		if (!event) {
			$showFullscreen = false;
			$editorView.focus();

			return;
		}

		const element = event.target as HTMLElement;

		if (event instanceof MouseEvent) {
			if (!element.children.length) {
				element.parentElement.style.display = "none";
				element.parentElement.childNodes.forEach((child) => child.remove());
			} else {
				element.style.display = "none";
				element.childNodes.forEach((child) => child.remove());
			}
		} else {
			fullPageEl.style.display = "none";
			fullPageEl.childNodes.forEach((child) => child.remove());
		}

		$editorView.focus();
	}

	function appendModalContent(modal: HTMLDivElement) {
		if (modalContent) {
			modal.appendChild(modalContent);
		}
	}
</script>

<svelte:document
	on:keyup={(e) => {
		if (e.key === "Escape" && fullPageEl.childElementCount) {
			closeImageViewer(e);
		}
	}}
/>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	bind:this={fullPageEl}
	use:appendModalContent
	id="lf-full_screen-modal"
	on:click={closeImageViewer}
	on:keypress={(e) => {
		if (e.key === "Escape") {
			closeImageViewer(e);
		}
	}}
>
	<slot />
</div>

<style>
	#lf-full_screen-modal {
		display: none;
		position: absolute;
		z-index: 526;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-size: contain;
		background-repeat: no-repeat no-repeat;
		background-position: center center;
		background-color: rgba(0, 0, 0, 0.9);
	}

	:global(#lf-full_screen-modal > img) {
		max-height: 90%;
		max-width: 90%;
		cursor: zoom-out;
	}
</style>
