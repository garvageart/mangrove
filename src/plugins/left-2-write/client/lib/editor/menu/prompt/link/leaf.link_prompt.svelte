<script lang="ts">
	import { editorState, editorView } from "$lib/stores/editor";
	import { copyToClipboard, isValidUrl } from "../../../../../../l2w.util";
	import LeafPrompt from "../leaf.prompt.svelte";
	import LeafPromptField from "../leaf.prompt_field.svelte";
	import { onMount } from "svelte";
	import leafSchema from "left-2-write/routes/new-editor/[id]/editor/leaf.schema";
	import type { Mark, Node } from "prosemirror-model";
	import { dev } from "$app/environment";
	import { toggleMark } from "prosemirror-commands";
	import { findMarkPositions, markActive } from "../../leaf.menu_commands";
	import { addToast } from "$lib/ui/notification_toast.store";
	import { TextSelection } from "prosemirror-state";

	// All this code needs some refactoring to make it easier to follow
	// I kinda get what's happening but I am also confused at times 🚶🏾‍♀️
	let link: string = null;
	let linkTitle: string;
	let editing: boolean;
	let currentMark: Mark;
	let currentNode: Node;

	let textToEnter: string;
	let { selection } = $editorState;
	const linkMark = leafSchema.marks.link;

	export let embedded = false;
	$: linkAttributes = {
		href: link,
		title: linkTitle
	};

	let isSelectionEmpty = selection.empty;

	function removeMark() {
		const { from, to } = $editorState.selection;
		const markRange = findMarkPositions(linkMark, $editorState.doc, from, to);

		$editorView.dispatch($editorState.tr.removeMark(markRange.start, markRange.end, linkMark));
	}

	function validateLink(link: string) {
		const isValid = isValidUrl(link);

		if (!isValid) {
			addToast({
				message: "Invalid link",
				dismissible: false
			});

			return false;
		}

		return true;
	}

	function applyLinkState() {
		const isValid = validateLink(link);
		const state = $editorView.state;
		const { $from, $to } = state.selection;
		const isActive = markActive(state, linkMark);

		if (!isValid) {
			return;
		}

		if (!isActive && !isSelectionEmpty) {
			toggleMark(linkMark, { href: link, title: linkTitle })(state, $editorView.dispatch, $editorView);
		} else if (isSelectionEmpty && !embedded) {
			const transaction = $editorView.state.tr;

			currentMark = linkMark.create(linkAttributes);
			$editorView.dispatch(transaction.insertText(textToEnter).addMark($from.pos, $from.pos + textToEnter.length, currentMark));
		} else {
			currentNode = $from.parent;

			removeMark();
			const markRange = findMarkPositions(linkMark, state.doc, $from.pos, $to.pos);
			currentMark = linkMark.create(linkAttributes);

			$editorView.dispatch($editorView.state.tr.addMark(markRange.start, markRange.end, currentMark));
		}

		const toResolved = $editorState.selection.$to;

		$editorView.dispatch($editorState.tr.setSelection(new TextSelection(toResolved)));
		toggleMark($editorState.schema.marks.link)($editorState, $editorView.dispatch, $editorView);

		addToast({
			message: "Link applied"
		});

		$editorView.focus();
	}

	$: if (link) {
		const isValid = isValidUrl(link);
		const { $from } = $editorState.selection;
		currentNode = $from.parent;

		if (dev) {
			if (isValid) {
				console.log("valid url", linkAttributes);
			} else {
				console.log("false dude");
			}
		}
	}

	$: {
		const { $from } = $editorState.selection;
		currentNode = $from.parent;

		if (
			(embedded === true && !currentMark?.attrs.href && link && isValidUrl(link)) ||
			(embedded === false && markActive($editorState, linkMark))
		) {
			if (!currentMark) {
				if (dev) {
					console.log("right here buddy");
				}

				currentMark = linkMark.create(linkAttributes);
			} else {
			}
		}
	}

	onMount(() => {
		const { $from, $to } = $editorState.selection;
		const rangeHasMark = markActive($editorState, linkMark);

		if (!isSelectionEmpty || (isSelectionEmpty && !embedded)) {

			editing = true;
			return;
		}

		if (rangeHasMark) {
			editing = false;
			const mark = $to.marks().find((value) => value.type === linkMark);

			link = mark.attrs.href as string;
			linkTitle = mark.attrs.title as string;
		} else {
			const selectionText = $editorState.doc.slice($from.pos, $to.pos).content.firstChild?.text.trim();

			if (isValidUrl(selectionText)) {
				link = selectionText;
			}
		}
	});
</script>

<svelte:document
	on:keyup={(e) => {
		if (e.code === "Enter") {
			applyLinkState();
		}
	}}
/>

<LeafPrompt promptTitle="Edit link">
	<svelte:fragment slot="contents">
		{#if !isSelectionEmpty || embedded}
			<hr />
			<div id="lf-link_prompt-buttons">
				<button class="lf-link_prompt-text_button" on:click={() => (editing = !editing)}>
					{editing === false ? "Edit" : "Close"}
				</button>
				{#if currentMark}
					<button class="lf-link_prompt-text_button" on:click={() => removeMark()}>Remove</button>
					<button
						class="lf-link_prompt-text_button lf-link_prompt-copy_button"
						on:click={() => {
							if (!link) {
								addToast({
									message: "No link provided",
									dismissible: false
								});

								return;
							}

							copyToClipboard(link);
							addToast({
								message: "Copied link to clipboard",
								dismissible: false
							});
						}}
					>
						Copy
					</button>
				{/if}
			</div>
		{/if}

		{#if isSelectionEmpty && !embedded}
			<LeafPromptField placeholder="Add text..." bind:value={textToEnter} />
			<LeafPromptField placeholder="Add link..." bind:value={link} />
			<!-- Okay some of the below if statements are slightly confusing but this works man <3 -->
			<!-- Update: No it doesn't -->
		{:else if (editing && isSelectionEmpty) || (editing && !isSelectionEmpty)}
			<LeafPromptField placeholder="Add link..." bind:value={link} />
			<LeafPromptField placeholder="Add title..." bind:value={linkTitle} />
		{:else if link && isValidUrl(link)}
			<a class="lf-link_prompt-edit_line" title={linkTitle} href={link} target="_blank" rel="noreferrer noopener">
				{link.replace(/(^\w+:|^)\/\//, "").replace(/\/+$/, "")}
			</a>
		{:else}
			<span class="lf-link_prompt-edit_line">No link provided</span>
		{/if}
		{#if editing}
			<button id="lf-link_apply_button" on:click={() => applyLinkState()}> Apply </button>
		{/if}
	</svelte:fragment>
</LeafPrompt>

<style>
	#lf-link_prompt-buttons {
		position: relative;
		display: flex;
		margin: 0.5em 0em;
	}

	.lf-link_prompt-text_button {
		font-size: 0.5em;
		font-weight: 600;
		margin-right: 1em;
		cursor: pointer;
	}

	.lf-link_prompt-edit_line {
		width: 100%;
		font-size: 0.6em;
		margin-top: -0.5em;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 1;
		overflow: hidden;
	}

	a {
		color: var(--link-colour);
		text-decoration: underline;
	}

	a:hover {
		text-decoration: none;
	}

	.lf-link_prompt-copy_button {
		margin-right: 0em;
		position: absolute;
		right: 0;
	}

	#lf-link_apply_button {
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
