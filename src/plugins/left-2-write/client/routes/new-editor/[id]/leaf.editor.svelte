<svelte:options accessors />

<script lang="ts">
	import { dev } from "$app/environment";
	import { beforeNavigate } from "$app/navigation";
	import { navigating, page } from "$app/stores";
	import "highlight.js/styles/base16/snazzy.min.css";
	import { editorContents, editorState, editorView, hasUserInput, transactionCounter } from "left-2-write/lib/stores/editor";
	import { baseKeymap, chainCommands, createParagraphNear, liftEmptyBlock, selectAll, splitBlock } from "prosemirror-commands";
	import { applyDevTools, removeDevTools } from "prosemirror-dev-toolkit";
	import { history, redo, undo } from "prosemirror-history";
	import { keymap } from "prosemirror-keymap";
	import { DOMParser as PMDOMParser } from "prosemirror-model";
	import { EditorState } from "prosemirror-state";
	import { EditorView } from "prosemirror-view";
	import "prosemirror-view/style/prosemirror.css";
	import { onMount } from "svelte";
	import { L2W_SERVER_HREF } from "../../../../l2w.constants";
	import { isBetween, updateWordCounter } from "../../../../l2w.util";
	import type { PageData } from "./$types";
	import { buildInputRules } from "./editor/leaf.input_rules";
	import {
		buildCustomCommands,
		buildHeadingKeymap,
		buildMarksKeymap,
		createParagraphBelow,
		renderMenuKeymap,
		createExplicitNewParagraph
	} from "./editor/leaf.keymap";
	import { createSvelteNodeView } from "./editor/leaf.nodeview";
	import leafSchema from "./editor/leaf.schema";
	import "./leaf-editor.css";
	import { nodeToElement, saveDocument, setUpDocument, syncPostData } from "./leaf.utils";
	import LeafAuthor from "./nodes/leaf.author.svelte";
	import LeafBody from "./nodes/leaf.body.svelte";
	import LeafHeader from "./nodes/leaf.editor_header.svelte";
	import LeafImageEditor from "./nodes/leaf.image_editor.svelte";
	import LeafLastSaved from "./nodes/leaf.last_saved.svelte";
	import LeafSummary from "./nodes/leaf.summary.svelte";
	import LeafTitle from "./nodes/leaf.title.svelte";
	import figurePlugin from "./plugins/leaf.figure";
	import linksPlugin from "./plugins/leaf.links";
	import menuPlugin from "./plugins/leaf.menu";
	import placeholderText from "./plugins/leaf.placeholder";
	import savePlugin from "./plugins/leaf.save";
	import { selectAllTextInParent } from "./plugins/leaf.selection";
	import syntaxHighlighterPlugin from "./plugins/leaf.syntax_highlighter";

	let editorEl: HTMLDivElement;

	const data = $page.data as PageData;
	const { postData } = data;
	export let view: EditorView = null;
	export let state: EditorState = null;

	const editorConfig = {
		schema: leafSchema,
		plugins: [
			buildInputRules(leafSchema),
			keymap(renderMenuKeymap()),
			keymap(buildCustomCommands(leafSchema)), // Custom commands
			keymap(buildHeadingKeymap(leafSchema)), // Commands for headings
			keymap(buildMarksKeymap(leafSchema)), // Commands for marks
			keymap({
				"Mod-z": undo,
				"Mod-Shift-z": redo,
				"Mod-y": redo,
				"Mod-a": selectAllTextInParent,
				"Mod-Shift-a": selectAll,
				Enter: chainCommands(createExplicitNewParagraph, liftEmptyBlock, splitBlock), // Creates break paragraph and new paragraph
				"Shift-Enter": chainCommands(createParagraphNear, liftEmptyBlock, splitBlock), // Creates regular paragraph below
				"Mod-Shift-Enter": createParagraphBelow //  While keeping the same selection position, creates a new paragraph below
			}),
			// Order of commands is important. Custom commands will take priority over base keymaps
			// if placed up earlier in the plugins array
			keymap(baseKeymap),
			history(),
			placeholderText,
			menuPlugin,
			savePlugin,
			linksPlugin,
			figurePlugin,
			syntaxHighlighterPlugin
		]
	};

	onMount(() => {
		updateWordCounter(postData.l2w_plain_text);

		let whichSetUp: number;
		if (new Date(postData.l2w_pm_save_date).getTime() > new Date(postData.l2w_quill_save_date).getTime()) {
			whichSetUp = 1;

			// Hack to fix old incompatible schema node type names
			const editorStateJSON = JSON.stringify(postData.l2w_pm_state)
				.replaceAll('"type":"editorHeader"', '"type":"editor_header"')
				.replaceAll('"type":"editorBody"', '"type":"editor_body"');
			postData.l2w_pm_state = JSON.parse(editorStateJSON);

			state = EditorState.fromJSON({ ...editorConfig }, postData.l2w_pm_state);
		} else {
			whichSetUp = 2;

			const domDocument = setUpDocument(postData);
			state = EditorState.create({ ...editorConfig });

			state.doc = PMDOMParser.fromSchema(leafSchema).parse(domDocument, {
				preserveWhitespace: "full"
			});
		}

		if (dev) {
			console.log("what is running:", whichSetUp);
		}

		$editorState = state;
	});

	let inputTransactions: number = 0;

	beforeNavigate((navigation) => {
		if (dev) {
			console.log(`Saving before navigation to ${navigation.to.url}`);
			console.log("Asking server to sync with Webflow");
		}

		syncPostData(postData.l2w_id);

		if (inputTransactions) {
			saveDocument($editorContents);
		}
	});

	if ($navigating) {
		window.onbeforeunload = () => {
			if (dev) {
				console.log(`Saving before unloading`);
				console.log("Asking server to sync with Webflow");
			}

			fetch(`${L2W_SERVER_HREF}/sync?postID=${postData.l2w_id}`, {
				method: "PUT"
			});

			if (inputTransactions) {
				saveDocument($editorContents);
			}
		};
	}

	let mainElement = document.querySelector("main");

	// This allows the window to scroll automatically when the `scrollHeight` changes while typing in the editor
	// to keep the same editing position on screen, so the user doesn't have to keep
	// manually scrolling
	$: scrollPosition = null as number;
	$: if (mainElement) {
		if ($editorState) {
			const range = 100;

			if (scrollPosition) {
				const isBetweenPositions = isBetween(scrollPosition, scrollPosition - range, scrollPosition);

				if (isBetweenPositions) {
					mainElement.scrollTo({
						left: 0,
						top: scrollPosition,
						behavior: "smooth"
					});
				}
			}
		}
	}

	onMount(() => {
		if (!editorEl) {
			// This is just in case I somehow incorrectly reference the DOM element
			// and don't get caught up in confusion
			throw new Error("Editor element not found on DOM");
		}

		const initialTitle = document.title;
		document.title = postData.l2w_title + ` | ${initialTitle}`;

		view = new EditorView(
			{ mount: editorEl },
			{
				state: $editorState,
				attributes: {
					"data-post-id": postData.l2w_id
				},
				nodeViews: {
					editor_header: createSvelteNodeView({
						component: LeafHeader,
						parentNode: {
							element: "div"
						}
					}),
					summary: createSvelteNodeView({
						component: LeafSummary,
						contentNode: {
							element: "h2"
						},
						update(node) {
							const text = node.textContent;
							if (!text && !$hasUserInput) {
								return false;
							}
							$editorContents.l2w_summary = text;
							return true;
						}
					}),
					author: createSvelteNodeView({
						component: LeafAuthor,
						parentNode: {
							attributes: {
								style: "display: inline-block;"
							}
						},
						contentNode: {
							element: "h3"
						}
					}),
					last_saved: createSvelteNodeView({
						component: LeafLastSaved,
						parentNode: {
							attributes: {
								style: "display: inline-block;"
							}
						},
						contentNode: {
							element: "h3"
						}
					}),
					title: createSvelteNodeView({
						component: LeafTitle,
						contentNode: {
							element: "span"
						},
						update(node) {
							const text = node.textContent;
							if (!text) {
								document.title = initialTitle;
								return false;
							}

							if (!$hasUserInput && !postData.l2w_title) {
								return false;
							}

							document.title = text + ` | ${initialTitle}`;
							$editorContents.l2w_title = text;
							return true;
						}
					}),
					editor_body: createSvelteNodeView({
						component: LeafBody,
						parentNode: {
							attributes: {
								style: "height: 100%; margin-bottom: calc(297mm / 3);"
							}
						},
						update(node, _decorations, innerDecorations) {
							const text = node.textBetween(0, node.nodeSize - 2, "\n");
							updateWordCounter(text);
							// @ts-ignore
							if (!text && !$hasUserInput && innerDecorations.children.length) {
								return false;
							}

							$editorContents.l2w_plain_text = text;
							$editorContents.l2w_raw_html = nodeToElement(node, leafSchema).innerHTML;

							return true;
						}
					}),
					image: createSvelteNodeView({
						component: LeafImageEditor,
						stopEvent() {
							return true;
						}
					})
				},
				dispatchTransaction(transaction) {
					if (!view) {
						return;
					}

					$transactionCounter++;

					if (dev) {
						console.log("Transaction Counter:", $transactionCounter);
					}

					state = view.state.apply(transaction);
					editorState.set(state);
					const isDocSameSize = transaction.before.content.size === transaction.doc.content.size;

					if (transaction.docChanged || !isDocSameSize) {
						inputTransactions++;

						if (dev) {
							console.log("Document size went from", transaction.before.content.size, "to", transaction.doc.content.size);
						}
					}

					if (inputTransactions === 1) {
						$hasUserInput = true;
						console.log("starting save");
					}

					let { $from, $to } = state.selection;

					if ($from.pos !== $to.pos) {
						console.log("selection from", $from.pos, "to", $to.pos);
					}

					view.updateState(state);
				},
				handleKeyPress(_view, event) {
					if (event && !$hasUserInput) {
						$hasUserInput = true;
					}
				},
				handleTextInput() {
					scrollPosition = mainElement?.scrollHeight;
				}
			}
		);

		// @ts-ignore
		window.view = $editorView = view;

		if (dev) {
			applyDevTools($editorView);
		}

		$editorView.focus();
		mainElement?.addEventListener("scroll", () => {
			scrollPosition = mainElement.scrollHeight;
		});

		return () => {
			$editorView.destroy();
			removeDevTools();
		};
	});
</script>

<svelte:document
	on:keydown={(ev) => {
		if (ev.altKey && ev.key === "s") {
			if (dev) {
				console.log("Saving via keyboard shortcut");
			}

			saveDocument($editorContents);
		}
	}}
/>

<div id="editor" bind:this={editorEl} />

<style>
	#editor {
		display: flex;
		flex-direction: column;
		background-color: var(--almost-white);
		max-width: 210mm;
		min-height: 297mm;
		border: 1px solid #ccc;
		position: relative;
		padding: 0in 1.2in;
		margin: 0em 4em 2em 4em;
	}
</style>
