<script lang="ts">
	import { getContext } from "svelte";
	import type { ILeft2Write, ILeft2WriteMenuOptions, PostAction } from "../../../../../../types/plugins/l2w.types";
	import { deletePost, sleep } from "../../../../l2w.util";
	import ContextMenu from "./ContextMenu.svelte";
	import type { Writable } from "svelte/store";
	import { L2W_SERVER_HREF } from "../../../../l2w.constants";
	import { addToast } from "../notification_toast.store";
	import { goto } from "$app/navigation";
	import { dev } from "$app/environment";
	import { PUBLIC_WEBSITE_STAGING_DOMAIN_NAME, PUBLIC_WEBSITE_DOMAIN_NAME } from "$env/static/public";
	import { publishPost } from "left-2-write/routes/new-editor/[id]/leaf.utils";
	import { fade } from "svelte/transition";

	export let postData: ILeft2Write;
	export let showMenu = false;

	const posts = getContext("sortedPosts") as Writable<ILeft2Write[]>;
	const menuOptions: ILeft2WriteMenuOptions[] = [
		{
			itemName: "Delete",
			async action() {
				const deleted = await deletePost(postData);
				if (deleted) {
					$posts = $posts.filter((post) => post.l2w_id !== postData.l2w_id);
				}
			}
		},
		{
			itemName: "Duplicate",
			async action() {
				const response = await fetch(`${L2W_SERVER_HREF}/duplicate`, {
					body: JSON.stringify({ id: postData.l2w_id }),
					method: "POST"
				});

				if (response.ok) {
					const responseData = (await response.json()) as ILeft2Write;
					let message = `"${postData.l2w_title}" has been duplicated`;

					if (!postData.l2w_title.trim()) {
						message = "Post has been duplicated";
					}

					addToast({
						message,
						timeout: 3000
					});

					await sleep(2000);

					const useNewEditor = !dev ? "editor" : "new-editor";
					goto(`${useNewEditor}/${responseData.l2w_id}`);
				} else {
					addToast({
						message: `${response.status} — ${(await response.json()).error}`,
						timeout: 3000
					});
				}
			}
		},
		{
			itemName: "Print",
			action: () => {
				goto(`new-editor/${postData.l2w_id}?print=true`);
			}
		}
	];

	if (postData.l2w_wf_post_status === "published" || postData.l2w_wf_post_status === "staged") {
		const status = postData.l2w_wf_post_status === "published" ? "Unpublish" : "Publish";
		menuOptions.unshift({
			itemName: status,
			async action() {
				const action = status.toLowerCase() as PostAction;
				await publishPost(action);
			}
		});

		menuOptions.push({
			itemName: "Open on Website",
			action() {
				const postHref =
					postData.l2w_wf_published_on_staged_only || dev ? PUBLIC_WEBSITE_STAGING_DOMAIN_NAME : PUBLIC_WEBSITE_DOMAIN_NAME;
				open(`https://${postHref}/posts/${postData.l2w_slug}`, "_blank", "noopener, noreferrer");
			}
		});
	}

	function openContextMenu() {
		if (showMenu === true) {
			showMenu = false;
			return;
		}

		showMenu = true;
	}
</script>

<div
	id="post-ctx-menu"
	class="post-ctx-icon-container"
	role="button"
	tabindex="0"
	transition:fade={{ duration: 300 }}
	on:click={openContextMenu}
	on:keydown={(e) => {
		if (e.code === "Space") {
			openContextMenu();
		}
	}}
>
	<svg id="post-ctx-menu-icon" width="6" height="30" viewBox="0 0 6 36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<circle cx="3" cy="33" r="3" fill="#181818" />
		<circle cx="3" cy="18" r="3" fill="#181818" />
		<circle cx="3" cy="3" r="3" fill="#181818" />
	</svg>

	{#if showMenu}
		<ContextMenu bind:showMenu {menuOptions} />
	{/if}
</div>

<style>
	#post-ctx-menu {
		position: absolute;
		right: 0px;
		width: 1em;
		margin: 0em 0.5em;
		display: flex;
		cursor: pointer;
		align-content: center;
		justify-content: center;
	}

	.post-ctx-icon-container {
		width: 1em;
		display: flex;
		padding: 0.25em;
		border-radius: 1em;
		cursor: pointer;
		align-content: center;
		justify-content: center;
		transition: background-color 0.3s ease-out;
	}

	.post-ctx-icon-container:hover {
		background-color: #aaaaaa;
	}
</style>
