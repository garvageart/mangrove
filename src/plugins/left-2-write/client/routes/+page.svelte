<script lang="ts">
	import Header from "$lib/ui/header.svelte";
	import type { ILeft2Write } from "../../../../types/plugins/l2w.types";
	import { L2W_EDITOR_HREF, L2W_SERVER_HREF } from "../../l2w.constants";
	import { convertDate, convertToSentenceCase } from "../../l2w.util";
	import type { PageData } from "./$types";
	// import "../static/css/home.css";

	export let data: PageData;

	// if (dev === "production") {
	// 	document
	// 		.getElementsByTagName("head")[0]
	// 		.append((document.createElement("script").src = "js/main.js"));
	// }

	async function createNewPost() {
		const currentDate = new Date();

		const requestData = await fetch(`${L2W_SERVER_HREF}/posts`, {
			body: JSON.stringify({
				l2w_author: "Les",
				l2w_last_saved_at: currentDate,
				l2w_title: "Untitled post",
				l2w_wf_post_status: "draft"
			} as ILeft2Write),
			method: "POST"
		});

		if (requestData.ok) {
			location.href = `${L2W_EDITOR_HREF}/editor/${await requestData.text()}`;
		}
	}
</script>

<svelte:head>
	<title>Leaf Editor | Home</title>
</svelte:head>

<Header />

<main id="main-container">
	<div id="top-bar">
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			id="new-post-button"
			role="button"
			tabindex="0"
			aria-label="Create a new post"
			title="Create a new post"
			on:click={createNewPost}
		>
			<div id="plus-icon-container">
				<svg xmlns="http://www.w3.org/2000/svg" width="36.5" height="36.5">
					<g id="plus-icon" data-name="plus-icon" transform="translate(-104.75 -230.75)">
						<line
							id="vertical-line"
							data-name="vertical-line"
							y2="36.5"
							transform="translate(123 230.75)"
							fill="none"
							stroke="#f8f8f8"
							stroke-width="3"
						/>
						<line
							id="horizontal-line"
							data-name="horizontal-line"
							y2="36.5"
							transform="translate(141.25 249) rotate(90)"
							fill="none"
							stroke="#f8f8f8"
							stroke-width="3"
						/>
					</g>
				</svg>
			</div>
			<div id="new-post-button-text-container">
				<div id="new-post-button-text">New Post</div>
			</div>
		</div>
	</div>

	<div id="posts-container">
		{#each data.posts as post}
			<a id="post-container" href="editor/{post.l2w_id}" class="single-post-container" data-post-id={post.l2w_id}>
				<div id="title-container">
					<h1 id="post-title">
						{post.l2w_title}
					</h1>
					<div id="post-details">
						<h2 id="post-last_saved_at" class="post-container-subtitle">
							{convertDate(new Date(post.l2w_last_saved_at))}
						</h2>
						<h2 id="post-status" class="post-container-subtitle">
							{convertToSentenceCase(String(post.l2w_wf_post_status))}
						</h2>
					</div>
				</div>
				<div id="post-content">
					{#if !post.l2w_plain_text.trim()}
						<em>Nothing to show here :(</em>
					{:else}
						{post.l2w_plain_text}
						<!-- {@html post.l2w_raw_html.replaceAll(/<a.*?>.*?<\/a>/ig,'')} -->
					{/if}
				</div>
			</a>
		{/each}
	</div>
</main>

<style>
	#main-container {
		/* margin: 1em; */
		padding: 2em 5em;
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		align-content: center;
	}

	.single-post-container {
		height: 10em;
		min-width: 12em;
		max-width: 13em;
		border: 1px solid;
		margin: 0 0 0 0;
		overflow: hidden;
		background-color: var(--almost-white);
		transition: background-color 0.5s ease;
	}

	.single-post-container:hover {
		background-color: #ececec;
	}

	#posts-container {
		display: grid;
		gap: 1.5em 6em;
		grid-template-columns: repeat(3, 1fr);
		/* align-items: center;
		align-content: center;
		justify-items: center; */
	}

	#post-title {
		font-size: 0.8em;
		font-weight: 700;
		margin-bottom: 0.1em;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 1;
		overflow: hidden;
		line-height: 115%;
	}

	#post-title:hover {
		text-decoration: underline;
	}

	#post-details {
		display: flex;
	}

	.post-container-subtitle {
		font-size: 0.5em;
		font-weight: 400;
		margin-right: 1em;
	}

	#post-content {
		font-weight: 300;
		font-size: 0.6em;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 6;
		overflow: hidden;
		margin: 0.5em 0.9em 0.5em 0.9em;
		opacity: 75%;
	}

	#post-content:hover {
		text-decoration: none;
	}

	#title-container {
		padding: 0.5em;
		display: flex;
		flex-direction: column;
		align-content: center;
		border-bottom: 1px solid;
		margin-bottom: 0.2em;
		background-color: var(--almost-black);
		color: var(--almost-white);
	}

	#new-post-button {
		border: 1px solid;
		max-width: 6.5em;
		display: flex;
		flex-direction: row;
		background-color: var(--almost-white);
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	#new-post-button:hover {
		background-color: #ececec;
	}

	#new-post-button-text {
		font-size: 0.6em;
		font-weight: 600;
		margin: 0.3em;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		overflow: auto;
	}

	#new-post-button-text-container {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-content: center;
		overflow: auto;
		/* height: 100%; */
		width: 100%;
	}

	#plus-icon-container {
		background-color: var(--almost-black);
		width: 2em;
		height: 1.5em;
		float: left;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding: 0.1em;
	}

	#top-bar {
		margin-bottom: 1em;
	}
</style>
