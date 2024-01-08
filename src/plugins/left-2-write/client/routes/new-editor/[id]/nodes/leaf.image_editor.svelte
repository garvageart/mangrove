<script lang="ts">
	import type { Writable } from "svelte/store";
	import { useNodeViewContext } from "../editor/leaf.nodeview";
	import type { Node } from "prosemirror-model";
	import { setContext } from "svelte";
	import { dev } from "$app/environment";
	import Image from "$lib/editor/leaf.image.svelte";

	const contentRef = useNodeViewContext("contentRef");
	const view = useNodeViewContext("view");
	const node = useNodeViewContext("node") as Writable<Node>;
	const setAttrs = useNodeViewContext("setAttrs");
	let selected = useNodeViewContext("selected");

	setContext("editor", view);

	const loaderSource = "/images/loader-spinner.svg";
	const nodeAttrs = $node.attrs;

	let isEditing = false;

	function toggleEdit() {
		isEditing = !isEditing;
	}

	$: imageAttributes = nodeAttrs;

	let fig: HTMLElement;
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<figure
	bind:this={fig}
	use:contentRef
	class="lf-img-editor-container"
>
	<div class="lf-edit-bar">
		<button on:click={toggleEdit}>{isEditing ? "Close" : "Edit"}</button>
		{#if isEditing}
			<input
				bind:value={imageAttributes.src}
				placeholder="Add image link..."
				autocomplete="off"
				on:input={(event) => {
					if (dev) {
						console.log(event.currentTarget.value);
					}

					setAttrs({
						src: event.currentTarget.value
					});
				}}
			/>
			<input
				bind:value={imageAttributes.alt}
				placeholder="Add alt text..."
				autocomplete="off"
				on:input={(event) => {
					if (dev) {
						console.log(event.currentTarget.value);
					}

					setAttrs({
						alt: event.currentTarget.value
					});
				}}
			/>
		{:else}
			<a class="lf-img-hyperlink" href={imageAttributes.src} target="_blank" rel="noopener noreffer">{imageAttributes.src} </a>
		{/if}
	</div>
	{#if isEditing}
		<input
			class="lf-img-caption-input"
			placeholder="Add image credits..."
			autocomplete="off"
			bind:value={imageAttributes["data-credits"]}
			on:input={(event) => {
				if (dev) {
					console.log(event.currentTarget.value);
				}

				setAttrs({
					"data-credits": event.currentTarget.value
				});
			}}
		/>
	{/if}
	<div class={!imageAttributes.src ? "lf-img-container" : ""}>
		{#if imageAttributes.src}
			<Image src={imageAttributes.src} alt={imageAttributes.alt} {nodeAttrs} />
		{:else}
			<!-- svelte-ignore a11y-img-redundant-alt -->
			<img class="lf-img-load_spinner" src={loaderSource} alt="Loading spinner which shows while there is no source image" />
		{/if}
	</div>
	<figcaption class="lf-img-caption">{!imageAttributes["data-credits"] ? "" : imageAttributes["data-credits"]}</figcaption>
</figure>

<style>
	.lf-img-editor-container {
		border: var(--almost-black) 3px solid;
		color: var(--almost-black);
		background-color: var(--almost-white);
		/* border-radius: 0.5em; */
		width: 100%;
		padding: 0.5em;
		display: flex;
		margin: 1em auto;
		flex-direction: column;
		gap: 0.4em;
	}

	.lf-edit-bar {
		display: flex;
		gap: 0.25em;
		flex-direction: row;
		align-items: center;
	}

	.lf-img-hyperlink {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 1;
		overflow: hidden;
	}

	.lf-img-caption-input {
		width: auto;
	}

	.lf-img-caption {
		color: #696969;
		/* font-style: italic; */
	}

	:global(.lf-img-uploading) {
		max-width: 98% !important;
		filter: blur(5px);
		opacity: 0.3;
	}

	input {
		width: 100%;
		border: var(--almost-black) 0.2em solid;
		font-family: "Switzer-Variable", "sans-serif";
		letter-spacing: 0.4px;
		color: var(--almost-black);
		padding: 0.5em 0.5em;
	}

	input::placeholder {
		font-style: italic;
	}

	input:focus {
		outline: none;
	}

	input::selection {
		background-color: var(--link-colour);
	}

	button {
		color: var(--almost-black);
		font-family: "Switzer-Variable", "sans-serif";
		font-size: 1em;
		font-weight: 600;
		cursor: pointer;
		/* background-color: white; */
		/* border: black 1px solid; */
		/* border-radius: 0.25em; */
		padding: 0.25em 0.5em;
	}

	.lf-img-container {
		height: 540px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.lf-img-load_spinner {
		height: 75%;
	}
	/* button:hover {
		background-color: #444;
		color: white;
		border: black 1px solid;
	} */
</style>
