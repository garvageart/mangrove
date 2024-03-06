<script lang="ts">
	import { L2W_ALLOWED_IMAGE_TYPES } from "../../../../../../l2w.constants";
	import LeafImageController from "./leaf.add_image";
	import LeafPrompt from "../leaf.prompt.svelte";
	import LeafPromptField from "../leaf.prompt_field.svelte";
	import { showMenu } from "$lib/stores/editor";

	const imageController = new LeafImageController(L2W_ALLOWED_IMAGE_TYPES);

	$: imageAttributes = {
		src: null as string,
		alt: null as string,
		credits: null as string,
		"img-id": null as string
	};

	$: link = imageAttributes.src;
</script>

<LeafPrompt promptTitle="Insert image">
	<svelte:fragment slot="contents">
		<LeafPromptField label="Link" placeholder="Add image link..." bind:value={imageAttributes.src} />
		<LeafPromptField label="Alt text" placeholder="Add alt text..." bind:value={imageAttributes.alt} />
		<LeafPromptField label="Credits" placeholder="Add image credits..." bind:value={imageAttributes.credits} />
		<button
			id="lf-image_insert_button"
			on:click={async () => {
				const uploadedData = await imageController.uploadImage();
				link = uploadedData.url;
				imageAttributes["img-id"] = uploadedData.id;

				$showMenu = false;
			}}
		>
			Choose Image
		</button>
	</svelte:fragment>
</LeafPrompt>

<style>
	#lf-image_insert_button {
		border-radius: 0px;
		font-family: "Switzer-Variable";
		font-weight: 500;
		font-size: 0.5em;
		color: var(--almost-white);
		background-color: var(--almost-black);
		width: 10em;
		height: 2.5em;
		margin-top: 1em;
		padding: 1em;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		cursor: pointer;
	}
</style>
