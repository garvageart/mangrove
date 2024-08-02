<script lang="ts">
	import { dev } from "$app/environment";
	import Header from "$lib/ui/Header.svelte";
	import type { ILeft2Write } from "../../../../types/plugins/l2w.types";
	import { L2W_EDITOR_HREF, L2W_SERVER_HREF } from "../../l2w.constants";
	import { convertToSentenceCase } from "../../l2w.util";
	import type { PageData } from "./$types";
	import { onMount, setContext } from "svelte";
	import { goto } from "$app/navigation";
	import { DateTime } from "luxon";
	import ContextMenu from "$lib/ui/ContextMenu/HomeContextMenu.svelte";
	import Toasts from "$lib/ui/notification_toasts.svelte";
	import { writable } from "svelte/store";
	import { PUBLIC_WEBSITE_DOMAIN_NAME, PUBLIC_WEBSITE_STAGING_DOMAIN_NAME } from "$env/static/public";

	export let data: PageData;
	let dateSortedPosts = data.posts.sort((a, b) => {
		return new Date(b.l2w_last_saved_at).getTime() - new Date(a.l2w_last_saved_at).getTime();
	});

	let posts = writable(dateSortedPosts);
	setContext("sortedPosts", posts);

	onMount(() => {
		document.body.style.backgroundColor = "var(--almost-white)";
	});

	async function createNewPost() {
		const currentDate = new Date();

		const requestData = await fetch(`${L2W_SERVER_HREF}/posts`, {
			body: JSON.stringify({
				l2w_author: "Les",
				l2w_title: "Untitled Post",
				l2w_last_saved_at: currentDate,
				l2w_wf_post_status: "draft"
			} as ILeft2Write),
			method: "POST"
		});

		if (requestData.ok) {
			// const useNewEditor = !dev ? "editor" : "new-editor";
			goto(`new-editor/${await requestData.text()}`);
		}
	}
</script>

<svelte:head>
	<title>Home</title>
	<link rel="stylesheet" href="css/home.css" />
</svelte:head>

<Toasts />
<Header>
	<div
		id="new-post-button"
		role="button"
		tabindex="0"
		aria-label="Create a new post"
		title="Create a new post"
		slot="new-post-button"
		on:click={createNewPost}
		on:keydown={createNewPost}
	>
		<div id="plus-icon-container">
			<svg width="30" height="24" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect x="13" width="3" height="30" fill="#111111" />
				<rect x="30" y="13" width="3" height="30" transform="rotate(90 30 13)" fill="#111111" />
			</svg>
		</div>
		<div id="new-post-button-text-container">
			<div id="new-post-button-text">New Post</div>
		</div>
	</div>
</Header>

<main>
	<div id="posts-container">
		{#key $posts}
			{#each $posts as post}
				<!-- {@const editorHref = dev ? `new-editor/${post.l2w_id}` : `editor/${post.l2w_id}`} -->
				{@const editorHref = `new-editor/${post.l2w_id}`}
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div id="post-container" class="single-post-container" data-post-id={post.l2w_id} on:dblclick={() => goto(editorHref)}>
					<div
						id="title-container"
						on:contextmenu|preventDefault={(event) => {
							const target = event.currentTarget;
							new ContextMenu({
								target,
								props: {
									postData: post,
									showMenu: true
								}
							});
						}}
					>
						<h1 id="post-title" title="Open '{post.l2w_title}' in editor">
							<a href={editorHref}>
								{#if !post.l2w_title || post.l2w_title.toLowerCase() === "untitled post"}
									<i style="font-style: italic; opacity: 90%;">No title</i>
								{:else}
									{post.l2w_title}
								{/if}
							</a>
						</h1>
						<div id="post-details">
							<h2 id="post-last_saved_at" class="post-container-subtitle">
								{DateTime.fromJSDate(new Date(post.l2w_last_saved_at)).toFormat("DDDD — T")}
							</h2>
							<h2 id="post-status" class="post-container-subtitle">
								{convertToSentenceCase(post.l2w_wf_post_status)}
							</h2>
							{#if post.l2w_wf_post_status === "published" && post.l2w_slug}
								{@const websiteDomain =
									post.l2w_wf_published_on_staged_only || dev ? PUBLIC_WEBSITE_STAGING_DOMAIN_NAME : PUBLIC_WEBSITE_DOMAIN_NAME}
								<a
									id="post-website-link"
									rel="noopener noreffer"
									target="_blank"
									class="post-container-subtitle"
									href="https://{websiteDomain}/posts/{post.l2w_slug}"
								>
									{!post.l2w_wf_published_on_staged_only ? "Live" : "Live (Staging)"}
								</a>
							{/if}
						</div>
						<ContextMenu postData={post} />
					</div>
				</div>
			{/each}
		{/key}
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
		max-height: 100%;
		overflow-y: scroll;
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		align-content: center;
	}

	.single-post-container {
		border: 1px solid;
		border-bottom: 3px solid;
		margin: 0 0 0.5em 0;
		background-color: var(--almost-white);
		transition: background-color 0.3s ease;
	}

	.single-post-container:hover {
		background-color: #dbdbdb;
	}

	#posts-container {
		display: flex;
		flex-direction: column;
		width: 90%;
		height: 100%;
		margin: 2em 0em;
		padding-bottom: 2em;
	}

	#post-title {
		font-size: 0.8em;
		font-weight: 700;
		margin-bottom: 0.1em;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		overflow: hidden;
		line-height: 115%;
		width: 40%;
	}

	#post-title:empty {
		content: "Untitled Post";
		color: var(--almost-white);
	}

	#post-title:hover {
		text-decoration: underline;
	}

	#post-details {
		display: flex;
	}

	.post-container-subtitle {
		font-size: 0.5em;
		font-weight: 500;
		margin-right: 1em;
	}

	#post-website-link {
		color: #626262;
		display: inline;
		text-decoration: underline;
	}

	#post-website-link:hover {
		text-decoration: none;
	}

	#post-container {
		padding: 0.5em;
		display: flex;
		flex-direction: column;
		justify-content: center;
		border-bottom: 6px solid;
		position: relative;
	}

	#title-container {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	#new-post-button {
		width: 5em;
		display: flex;
		flex-direction: row;
		position: absolute;
		right: 0;
		background-color: var(--almost-white);
		cursor: pointer;
		transition: background-color 0.3s ease;
		margin: 0 1em 0 0;
	}

	#new-post-button:hover {
		text-decoration: underline;
	}

	#new-post-button-text {
		font-size: 0.6em;
		font-weight: 600;
		margin: 0.1em;
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
		/* width: 100%; */
	}

	#plus-icon-container {
		/* background-color: var(--almost-black); */
		width: 1.5em;
		/* height: 1.5em; */
		float: left;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		/* padding: 0.1em; */
	}
</style>
