<script lang="ts">
	import { page } from "$app/stores";
	import { editorStatus, lastSavedAt, postStatus } from "$lib/stores/editor";
	import Loader from "$lib/states/loader.svelte";
	import { DateTime } from "luxon";
	import { convertToSentenceCase } from "../../../../l2w.util";
	import type { PostAction } from "../../../../../../types/plugins/l2w.types";
	import type { PageData } from "./$types";
	import { publishPost } from "./leaf.utils";

	const pageData = $page.data as PageData;
	const { postData } = pageData;
	const isDraftOrUnpublished = $postStatus === "draft" || $postStatus === "unpublished";

	function handleButtonKeyPress(event: KeyboardEvent, action: PostAction) {
		if (event.code !== ("Enter" || "Space")) {
			return;
		}

		publishPost(action);
	}
</script>

<header id="header">
	<div id="header-child">
		<a
			href="/"
			id="lf-home-text"
			title="Back to Home Page"
			class="header-text-container"
			data-sveltekit-reload
			data-sveltekit-preload-data>Home</a
		>
		{#if postData.l2w_post_history?.length}
			<div id="lf-story-history-container" class="header-text-container" title="View story history">
				<div>Story History</div>
				<svg
					id="lf-story-history-arrow"
					width="30"
					height="45"
					viewBox="0 0 91 42"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path d="M3 5L45.5 35L88 5" stroke="black" stroke-width="9" />
				</svg>
			</div>
		{/if}
		<a
			id="lf-quill-link"
			class="header-text-container"
			href={$page.url.href.replace("new-editor", "editor")}
			title="Use Quill Editor"
			data-sveltekit-reload
			>Old Editor
		</a>
		<!-- This whole button is so gross. Please fix it Les -->
		<!-- Update: Okay, this is slightly better but... ew -->
		<div id="lf-post-status-container">
			{#if $editorStatus !== $postStatus}
				<div id="lf-editor-status" class="header-text-container">
					{#if $editorStatus === "saved"}
						{`Saved at ${DateTime.fromJSDate($lastSavedAt).toFormat("T")}`}
					{/if}
				</div>
			{/if}
			<div
				id="lf-post-update"
				class="header-text-container"
				title="{$postStatus !== 'draft' ? 'Update' : 'Stage'} post to Webflow"
				tabindex="0"
				role="button"
				on:click={() => publishPost(isDraftOrUnpublished ? "stage" : "update")}
				on:keyup={(event) => handleButtonKeyPress(event, isDraftOrUnpublished ? "stage" : "update")}
			>
				{$postStatus !== "draft" ? "Update" : "Stage"}
			</div>
			<div
				id="lf-post-publish"
				class="header-text-container"
				title="Publish to Webflow"
				tabindex="0"
				role="button"
				on:click={() => publishPost("publish")}
				on:keyup={(event) => handleButtonKeyPress(event, "publish")}
			>
				{#if $editorStatus === "publishing"}
					{`${convertToSentenceCase($editorStatus)}...`}
				{:else}
					Publish
				{/if}
			</div>
		</div>
	</div>
</header>

<style>
	#header-child {
		border-bottom: 1px solid var(--border-colour);
		width: 100%;
		height: 1.8em;
		align-items: center;
		justify-content: left;
		position: relative;
		display: flex;
		background-color: var(--almost-white);
	}

	.header-text-container {
		height: 100%;
		font-weight: 600;
		font-size: 0.6em;
		border-right: 1px solid var(--border-colour);
		padding: 0em 1em;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.3s ease;
	}

	.header-text-container:hover {
		background-color: #dbdbdb;
	}

	/* #header {
		position: sticky;
		top: 0;
		z-index: 1;
	} */

	#lf-story-history-container {
		cursor: pointer;
	}

	#lf-story-history-arrow {
		margin-left: 0.5em;
	}

	#lf-post-status-container {
		position: absolute;
		right: 0px;
		/* border-left: 1px solid var(--border-colour); */
		border-right: 0px;
		display: flex;
		flex-direction: row;
		height: 100%;
	}

	#lf-post-status-container > [role="button"] {
		cursor: pointer;
	}

	#lf-editor-status {
		font-weight: 400;
		border-right: 0px;
	}

	#lf-editor-status:hover {
		background-color: var(--almost-white);
	}

	#lf-post-update {
		border-left: 1px solid var(--border-colour);
	}

	#lf-post-publish {
		color: var(--almost-white);
		background-color: var(--almost-black);
		border-right: 0px;
		min-width: 7em;
		transition: background-color 0.3s ease;
	}

	#lf-post-publish:hover {
		background-color: #2e2e2e;
	}
</style>
