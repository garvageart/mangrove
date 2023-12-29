<script lang="ts">
	import { editorState, editorView } from "$lib/stores/editor";
	import { toggleMark } from "prosemirror-commands";
	import { MarkType, NodeType } from "prosemirror-model";
	import type { Command, EditorState, Transaction } from "prosemirror-state";
	import { writable, type Writable } from "svelte/store";
	import { canInsert, canMark, isNode, markActive } from "./leaf.menu_commands";
	import { onMount } from "svelte";
	import leafSchema from "left-2-write/routes/new-editor/[id]/editor/leaf.schema";
	import { liftListItem } from "prosemirror-schema-list";

	// Things to do:
	// - Check state of mark/node and show disabled state if necessary
	// - Finish showing prompts for images and links

	// If there is a prompt, run the command inside the prompt's component
	// instead of running it inside the icon component.
	// The reason for this is that menu icons will simply do one thing, e.g. make some text bold
	// However, a prompt might have to handle several possible outcomes, and will have to write a command
	// for each possible outcome. This is more ergonomic than trying to handle the command inside the icon
	// as each prompt can handle its own commands as needed.
	export let markOrNode: MarkType | NodeType = null;
	export let command: Command = null;
	export let title: string;
	export let prompt = false;
	let showPrompt = false;
	let isCurrent: boolean;

	let isEnabled = writable(false);
	let enabled: boolean;
	let buttonContainer: HTMLButtonElement;
	let promptContainer: HTMLElement;
	isEnabled.subscribe((value) => (enabled = value));
	$: disabled = !$isEnabled;

	$: active = isCurrent;
	$: {
		const state = $editorState;

		if (markOrNode instanceof MarkType) {
			command = toggleMark(markOrNode);

			$isEnabled = canMark(state, markOrNode);
			isCurrent = markActive(state, markOrNode);
		} else {
			$isEnabled = canInsert(state, markOrNode);
			isCurrent = isNode(state, markOrNode);
		}
	}

	onMount(() => {
		if (!enabled) {
			title += " (Disabled)";
		}
	});

	function runMenuCommand() {
		if (enabled === false) {
			return;
		}

		if (markOrNode instanceof NodeType) {
			const { selection } = $editorState;
			const { $from } = selection;

			for (let d = $from.depth; d >= 0; d--) {
				const currentNode = $from.node(d);

				if (currentNode.type !== leafSchema.nodes.paragraph) {
					// I'm sure there's a better way to do this but this is fine
					if (currentNode.type === leafSchema.nodes.list_item) {
						$editorView.focus();

						liftListItem(currentNode.type)($editorState, $editorView.dispatch, $editorView);
						return;
					}

					$editorView.dispatch(
						$editorState.tr.setNodeMarkup(selection.from - 1, leafSchema.nodes.paragraph, currentNode.attrs, currentNode.marks)
					);

					break;
				}
			}
		}

		$editorView.focus();

		if (prompt) {
			if (showPrompt === true) {
				showPrompt = false;
				return;
			}

			showPrompt = true;
			return;
		}

		command($editorState, $editorView.dispatch, $editorView);
	}
</script>

<svelte:document
	on:click={(e) => {
		const target = e.target;
		// console.log(target, promptElement.parentElement.contains(target));

		// @ts-ignore
		if (promptContainer?.parentElement.contains(target) || target === promptContainer) {
			return;
		}

		showPrompt = false;
	}}
/>

<div class="lf-menu-button">
	<button bind:this={buttonContainer} {title} on:click={() => runMenuCommand()} class="lf-menu-icon" class:disabled class:active>
		<slot />
	</button>
	{#if showPrompt}
		<div bind:this={promptContainer} class="lf-prompt-container">
			<slot name="prompt" {showPrompt} />
		</div>
	{/if}
</div>

<style>
	.lf-prompt-container {
		position: relative;
	}

	.lf-menu-icon {
		cursor: pointer;
		padding: 0.3em 0.6em;
		margin: 0em 0.7em;
		height: 2em;
		width: 2em;
		overflow: visible;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.active {
		border-bottom: 0.2em solid var(--almost-black);
	}

	.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
