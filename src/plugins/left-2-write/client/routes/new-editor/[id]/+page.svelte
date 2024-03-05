<script lang="ts">
	import { dev } from "$app/environment";
	import Button from "$lib/editor/leaf.button.svelte";
	import Metadata from "$lib/editor/leaf.metadeta.svelte";
	import Seperator from "$lib/editor/leaf.seperator.svelte";
	import { editorState, editorStatus, lastSavedAt, postStatus } from "$lib/stores/editor";
	import Toasts from "$lib/ui/notification_toasts.svelte";
	import { DateTime } from "luxon";
	import { onMount } from "svelte";
	import { convertToSentenceCase } from "../../../../l2w.util";
	import type { PageData } from "./$types";
	import leafNewSchema from "./editor/leaf.schema";
	import LeafEditor from "./leaf.editor.svelte";
	import LeafPageHeader from "./leaf.header.svelte";
	import { nodeToElement } from "./leaf.utils";
	import ImageFullscreen from "$lib/editor/leaf.full_screen.svelte";

	export let data: PageData;
	const { postData } = data;

	$postStatus = postData.l2w_wf_post_status;
	$editorStatus = postData.l2w_wf_post_status;
	$lastSavedAt = new Date(postData.l2w_last_saved_at);

	onMount(async () => {
		document.body.style.backgroundColor = "#eeeeee";

		const editorSidebars = [...document.getElementsByClassName("editor-sidebar")];
		const headerElement = document.getElementById("header");
		editorSidebars.forEach((sidebar) => {
			const eSidebar = sidebar as HTMLElement;
			eSidebar.style.top = `${headerElement.offsetHeight + 6}px`;
		});
	});
</script>

<svelte:head>
	<title>Leaf Editor</title>
</svelte:head>

<LeafPageHeader />
<ImageFullscreen></ImageFullscreen>

<main>
	<div id="inner-main">
		<Toasts />
		<div id="left-sidebar" class="editor-sidebar">
			<div id="lf-md-word_count">0 Words</div>
			<Seperator />
			<Metadata title="Status" subtitle={convertToSentenceCase($postStatus)} showSeperator={true} />
			<Metadata title="Date Created" subtitle={DateTime.fromJSDate(new Date(postData.createdAt)).toFormat("dd/MM/y — T")} />
			{#if $postStatus === "published" || postData.l2w_wf_published_at}
				<Metadata
					title="Last Published"
					subtitle={DateTime.fromJSDate(new Date(postData.l2w_wf_published_at)).toFormat("dd/MM/y — T")}
				/>
			{/if}
		</div>

		<LeafEditor />

		<div id="right-sidebar" class="editor-sidebar">
			{#if dev}
				<Button
					on:buttonClicked={() => {
						console.log($editorState.toJSON());
						console.log(nodeToElement($editorState.doc, leafNewSchema));
					}}
					buttonText="Debug"
					buttonAction="Stage"
				/>
			{/if}
		</div>
	</div>
</main>

<style>
	:global(html) {
		overflow: hidden;
		height: 100%;
	}

	:global(body) {
		height: 100%;
	}

	main {
		flex-direction: row;
		overflow-y: scroll;
		overflow-x: hidden;
		display: flex;
		justify-content: center;
		max-height: 100%;
		width: 100%;
	}

	#inner-main {
		height: 100%;
		width: 100%;
		padding: 0em 1em;
		display: flex;
		flex-direction: row;
		justify-content: center;
		position: relative;
		margin: 2em 0em;
	}

	.editor-sidebar {
		position: -webkit-sticky;
		position: sticky;
		top: 15px;
		display: flex;
		flex-direction: column;
		align-self: flex-start;
		max-width: 7em;
		min-width: 5em;
		margin: 0em 2em;
	}

	#lf-md-word_count {
		font-weight: 700;
		font-size: 0.6em;
		margin-bottom: 0.5em;
	}
</style>
