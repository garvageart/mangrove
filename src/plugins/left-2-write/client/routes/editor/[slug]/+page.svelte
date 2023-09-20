<script lang="ts">
	import { getContext, onMount, setContext } from "svelte";
	import Metadata from "$lib/editor/leaf.metadeta.svelte";
	import Seperator from "$lib/editor/leaf.seperator.svelte";
	import Button from "left-2-write/lib/editor/leaf.button.svelte";
	// import Loader from "$lib/leaf.loader.svelte";
	import Quill from "quill";
	// @ts-ignore
	import { ImageDrop } from "quill-image-drop-module";
	import BlotFormatter, { ImageSpec } from "quill-blot-formatter";
	import { io } from "socket.io-client";
	import type Delta from "quill-delta";
	import { loading } from "left-2-write/lib/states/loader";
	import type { PageData } from "./$types";
	import { writable } from "svelte/store";
	import type {
		ILeft2Write,
		PostAction
	} from "../../../../../../types/plugins/l2w.types";
	import dayjs from "dayjs";
	import {
		L2W_EDITING_SERVER_HREF,
		L2W_SERVER_HREF
	} from "../../../../l2w.constants";
	import { convertToSentenceCase } from "../../../../l2w.util";
	import Loader from "left-2-write/lib/states/loader.svelte";

	Quill.register("modules/imageDrop", ImageDrop);
	Quill.register("modules/blotFormatter", BlotFormatter);
	Quill.register(
		"modules/counter",
		function (quill: Quill, options: { unit: string }) {
			const wordCounter = document.getElementById("lf-md-word_count");
			quill.on("text-change", function () {
				var text = quill.getText();
				if (options.unit === "word") {
					wordCounter.innerText = text.split(/\s+/).length - 2 + " words";
				} else {
					wordCounter.innerText = text.length + " characters";
				}
			});
		}
	);

	const socketConnection = io(L2W_EDITING_SERVER_HREF, {
		transports: ["polling"]
	});

	export let data: PageData;
	export let publishPostFunction: Function;

	const publishedStatus = writable(
		data.postData.l2w_wf_post_status === "published"
	);

	const onInactive = function (time: number, fn: Function) {
		let timeout: string | number | NodeJS.Timeout;

		function resetTimer() {
			clearTimeout(timeout);
			timeout = setTimeout(fn, time); // time is in milliseconds
		}

		const events: Array<keyof DocumentEventMap> = [
			"mousedown",
			"mousemove",
			"keypress",
			"scroll",
			"touchstart"
		];

		events.forEach((event) => {
			document.addEventListener(event, resetTimer, true);
		});
	};

	onMount(() => {
		const postTitle = document.getElementById("title") as HTMLInputElement;
		postTitle.value = data.postData.l2w_title;
		document.title = "Leaf Editor | " + postTitle.value;

		const editorElement = document.getElementById("editor");

		const editorSidebars = [
			...document.getElementsByClassName("editor-sidebar")
		];
		const headerElement = document.getElementById("header-top");
		editorSidebars.forEach((sidebar) => {
			const eSidebar = sidebar as HTMLElement;
			eSidebar.style.top = `${headerElement.offsetHeight + 30}px`;
		});

		const editor = new Quill(editorElement, {
			modules: {
				toolbar: "#toolbar",
				imageDrop: true,
				blotFormatter: {
					specs: [ImageSpec]
				},
				counter: {
					unit: "word",
					container: "lf-md-word_count"
				}
			},
			theme: "snow"
		});

		function saveDocument() {
			const editorTextArea = editorElement.firstChild as HTMLElement;
			const editorHTML = editorTextArea.innerHTML;

			$lastSavedAt = new Date();

			socketConnection.emit("save-document", {
				l2w_id: data.postID,
				l2w_ql_deltas: editor.getContents(),
				l2w_raw_html: editorHTML,
				l2w_last_saved_at: $lastSavedAt,
				l2w_plain_text: editor.getText(),
				l2w_title: postTitle.value
			} as ILeft2Write);
		}

		function createSaveTimer(timeMs: number) {
			return setInterval(() => {
				console.log("Saving changes...");
				saveDocument();
			}, timeMs);
		}

		let saveTimer: NodeJS.Timeout;

		socketConnection.on("connect", () => {
			editor.setContents(data.postData.l2w_ql_deltas);

			// editor.root.setAttribute("spellcheck", "true")

			let inactiveTimer = setTimeout(() => {
				console.log("Inactive for 10 seconds");
			}, 10000);

			editor.on("text-change", (delta, oldDelta, source) => {
				if (source !== "user") {
					return;
				}

				const typingTimeout = setTimeout(() => {
					socketConnection.emit("send-changes", delta);
				}, 500);

				if (!saveTimer) {
					saveTimer = createSaveTimer(10000);
				}

				onInactive(10000, () => {
					clearInterval(saveTimer);
					clearInterval(inactiveTimer);
					inactiveTimer = setTimeout(() => {
						console.log("Inactive for 10 seconds");
					}, 10000);
				});
			});

			socketConnection.on("document-data", (documentData: ILeft2Write) => {
				editor.updateContents(documentData.l2w_ql_deltas);
			});
		});

		const postButtonAction = async (action: PostAction) => {
			saveDocument();

			clearInterval(saveTimer);

			const publishedPost = (await fetch(
				`${L2W_SERVER_HREF}/publish/${data.postID}?action=${action}`,
				{
					method: "POST"
				}
			).then((res) => res.json())) as ILeft2Write;

			if (publishedPost) {
				$postStatus = publishedPost.l2w_wf_post_status;
				console.log("published");
			} else {
				console.log("not published");
				saveTimer = createSaveTimer(10000);
			}
		};

		publishPostFunction = postButtonAction;
	});

	export const placeholderText = "Lorem Ipsum";
	export const postStatus = writable(data.postData.l2w_wf_post_status);
	export const lastSavedAt = writable(data.postData.l2w_last_saved_at);
</script>

<svelte:head>
	<title>Leaf Editor</title>
	<link
		rel="preconnect"
		href="https://cdn.quilljs.com"
		crossorigin="anonymous"
	/>
	<link rel="stylesheet" href="https://cdn.quilljs.com/1.3.7/quill.snow.css" />
	<link rel="stylesheet" href="../css/editor.css" />
	<!-- <script src="https://cdn.quilljs.com/1.3.7/quill.js"></script> -->

	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css"
	/>
</svelte:head>

<div id="main-container">
	<div id="left-sidebar" class="editor-sidebar">
		<div id="lf-md-word_count">0 Words</div>
		<Seperator />
		<Metadata
			title="Author"
			subtitle={data.postData.l2w_author}
			showSeperator={false}
		/>
	</div>
	<div id="editor-container">
		<div id="editor" />
	</div>
	<div id="right-sidebar" class="editor-sidebar">
		<Metadata
			title="Status"
			subtitle={convertToSentenceCase($postStatus)}
			showSeperator={true}
		/>
		<Metadata
			title="Date Created"
			subtitle={dayjs(data.postData.createdAt).format("DD/MM/YYYY — HH:mm")}
			showSeperator={false}
		/>
		<Metadata
			title="Last Saved"
			subtitle={dayjs($lastSavedAt).format("DD/MM/YYYY — HH:mm")}
			showSeperator={false}
		/>
		{#if $postStatus === "published"}
			<Metadata
				title="Published On"
				subtitle={placeholderText}
				showSeperator={false}
			/>
		{/if}

		{#if $loading}
			<Loader />
		{:else}
			<Button
				on:buttonClicked={() =>
					publishPostFunction($postStatus === "draft" ? "stage" : "update")}
				buttonText={$postStatus === "staged" ? "Update" : "Stage"}
				buttonAction="Stage"
				mouseOverText=""
				showMouseOverText={false}
			/>
			<Button
				on:buttonClicked={() => publishPostFunction("publish")}
				buttonText={$publishedStatus ? "Published" : "Publish"}
				buttonAction="Publish Post"
				mouseOverText="Unpublish"
				showMouseOverText={$postStatus === "published"}
			/>
		{/if}
	</div>
</div>

<style>
	#editor {
		font-size: 0.6em;
		width: 210mm;
		height: 297mm;
	}

	#main-container {
		margin-bottom: 1em;
		margin-top: 1em;
		display: flex;
		flex-direction: row;
		/* align-content: flex-start; */
		justify-content: center;
		position: relative;
	}

	.editor-sidebar {
		position: -webkit-sticky;
		position: sticky;
		display: flex;
		flex-direction: column;
		align-self: flex-start;
		width: 7em;
	}

	#editor-container {
		/* border: 1px solid var(--border-colour); */
		/* box-shadow: 0px 2px 4px 1px rgba(0, 0, 0, 0.2); */
		margin-left: 3em;
		margin-right: 3em;
		background-color: #f8f8f8;
	}

	#lf-md-word_count {
		font-weight: 700;
		font-size: 0.6em;
		margin-bottom: 0.5em;
	}
</style>
