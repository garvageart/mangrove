<script lang="ts">
	import { onMount } from "svelte";
	import Metadata from "$lib/editor/leaf.metadeta.svelte";
	import Seperator from "$lib/editor/leaf.seperator.svelte";
	import Button from "$lib/editor/leaf.button.svelte";
	import CodeModal from "$lib/editor/leaf.code_modal.svelte";
	import Quill from "quill";
	// @ts-ignore
	import { ImageDrop } from "quill-image-drop-module";
	// @ts-ignore
	import ImageUploader from "quill-image-uploader";
	import QuillResizeImage from "quill-resize-image";
	import { io } from "socket.io-client";
	import type Delta from "quill-delta";
	import { loading } from "$lib/states/loader";
	import type { PageData } from "./$types";
	import { writable } from "svelte/store";
	import type { ILeft2Write, PostAction } from "../../../../../../types/plugins/l2w.types";
	import dayjs from "dayjs";
	import { L2W_SERVER_HREF } from "../../../../l2w.constants";
	import { convertDate, convertToSentenceCase } from "../../../../l2w.util";
	import Loader from "$lib/states/loader.svelte";
	import { addToast, addToast as showToast } from "$lib/ui/notification_toast.store";
	import Toasts from "left-2-write/lib/ui/notification_toasts.svelte";
	import { navigating } from "$app/stores";
	import "quill-image-uploader/dist/quill.imageUploader.min.css";

	Quill.register("modules/imageDrop", ImageDrop);
	Quill.register("modules/imageUploader", ImageUploader);
	Quill.register("modules/resize", QuillResizeImage);
	Quill.register("modules/counter", function (quill: Quill, options: { unit: string }) {
		const wordCounter = document.getElementById("lf-md-word_count");
		quill.on("text-change", function () {
			var text = quill.getText();
			if (options.unit === "word") {
				wordCounter.innerText = text.split(/\s+/).length - 2 + " words";
			} else {
				wordCounter.innerText = text.length + " characters";
			}
		});
	});

	const socketConnection = io(L2W_SERVER_HREF, {
		transports: ["polling"]
	});

	export let data: PageData;
	export let publishPostFunction: Function;

	const onInactive = function (time: number, fn: Function) {
		let inactiveTimer = setTimeout(fn, time);

		function resetTimer() {
			clearTimeout(inactiveTimer);
			inactiveTimer = setTimeout(fn, time);
		}

		const events: Array<keyof DocumentEventMap> = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "focus"];

		events.forEach((event) => {
			document.addEventListener(event, resetTimer, true);
		});
	};

	onMount(() => {
		const postTitle = document.getElementById("title") as HTMLSpanElement;
		const initialTitle = document.title;
		postTitle.innerText = data.postData.l2w_title;
		document.title = "Leaf Editor | " + postTitle.innerText;

		const editorElement = document.getElementById("editor");

		const editorSidebars = [...document.getElementsByClassName("editor-sidebar")];
		const headerElement = document.getElementById("header-top");
		editorSidebars.forEach((sidebar) => {
			const eSidebar = sidebar as HTMLElement;
			eSidebar.style.top = `${headerElement.offsetHeight + 60}px`;
		});

		const editor = new Quill(editorElement, {
			modules: {
				toolbar: "#toolbar",
				imageDrop: true,
				resize: {
					locale: {}
				},
				counter: {
					unit: "word",
					container: "lf-md-word_count"
				},
				imageUploader: {
					upload: (file: Blob) => {
						return new Promise(async (resolve, reject) => {
							const postID = data.postID;
							const dataURL = await new Promise((resolve, reject) => {
								const reader = new FileReader();
								reader.onloadend = () => resolve(reader.result);
								reader.readAsDataURL(file);
							});

							try {
								const responseData = await fetch(`${L2W_SERVER_HREF}/images`, {
									body: JSON.stringify({ dataURL, postID }),
									method: "POST"
								});

								setTimeout(async () => {
									saveDocument();

									resolve((await responseData.json()).url);
									addToast({ message: "Image uploaded successfully", timeout: 3000 });
								}, 3500);
							} catch (error) {
								const caughtError = error as Error;

								reject("Upload failed: " + caughtError.message);
								addToast({ message: caughtError.message as string, timeout: 3000 });
							}
						});
					}
				}
			},
			theme: "snow"
		});

		const quillSaveDate = new Date(data.postData.l2w_quill_save_date).getTime();
		const pmSaveDate = new Date(data.postData.l2w_pm_save_date).getTime();

		if (quillSaveDate < pmSaveDate || !quillSaveDate) {
			if (data.postData.l2w_raw_html) {
				editor.clipboard.dangerouslyPasteHTML(data.postData.l2w_raw_html);
				saveDocument();
			}
		} else if (data.postData.l2w_quill_save_date) {
			editor.setContents(data.postData.l2w_ql_deltas);
		}

		function saveDocument() {
			$lastSavedAt = new Date();

			socketConnection.emit("save-document", {
				l2w_id: data.postID,
				l2w_ql_deltas: editor.getContents(),
				l2w_raw_html: editor.root.innerHTML,
				l2w_last_saved_at: $lastSavedAt,
				l2w_quill_save_date: $lastSavedAt,
				l2w_plain_text: editor.getText(),
				l2w_title: postTitle.innerText.trim()
			} as ILeft2Write);
		}

		function createSaveTimer(timeMs: number) {
			return setInterval(() => {
				console.log("Saving changes...");
				saveDocument();
			}, timeMs);
		}

		document.onkeyup = (ev) => {
			if (ev.ctrlKey && ev.shiftKey && ev.key === "s") {
				console.log("Saving via keyboard shortcut");
				saveDocument();
			}
		};

		postTitle.onkeyup = () => {
			if (postTitle.innerText === "") {
				document.title = initialTitle;
				return;
			}

			if (!saveTimer) {
				saveTimer = createSaveTimer(10000);
			}

			onInactive(20000, () => {
				clearInterval(saveTimer);
			});

			document.title = initialTitle + ` | ${postTitle.innerText}`;
		};

		let saveTimer: NodeJS.Timeout;

		if ($navigating) {
			saveDocument();
		}

		socketConnection.on("connect", () => {
			editor.on("text-change", (delta, oldDelta, source) => {
				if (source !== "user") {
					return;
				}

				if (!editor.hasFocus()) {
					editor.focus();
				}

				const typingTimeout = setTimeout(() => {
					socketConnection.emit("send-changes", delta);
				}, 500);

				if (!saveTimer) {
					saveTimer = createSaveTimer(5000);
				}

				onInactive(300000, function () {
					clearInterval(saveTimer);
					console.log("Inactive after 20 seconds");
				});
			});

			socketConnection.on("document-data", (documentData: ILeft2Write) => {
				editor.updateContents(documentData.l2w_ql_deltas);
			});
		});

		const postButtonAction = async (action: PostAction) => {
			saveDocument();

			clearInterval(saveTimer);

			const publishResponse = await fetch(`${L2W_SERVER_HREF}/publish/${data.postID}?action=${action}`, {
				method: "POST"
			});

			const postData = (await publishResponse.json()) as ILeft2Write & { error: string };

			if (publishResponse.ok && postData) {
				$postStatus = postData.l2w_wf_post_status;

				showToast({
					message: `Post has been ${convertToSentenceCase($postStatus)}`,
					dismissible: true,
					timeout: 3000
				});
			} else {
				showToast({
					message: `${publishResponse.status} — ${postData.error}`,
					dismissible: true,
					timeout: 3000
				});
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
	<link rel="preconnect" href="https://cdn.quilljs.com" crossorigin="anonymous" />
	<link rel="stylesheet" href="https://cdn.quilljs.com/1.3.7/quill.snow.css" />
	<link rel="stylesheet" href="../css/editor.css" />
	<!-- <script src="https://cdn.quilljs.com/1.3.7/quill.js"></script> -->
	<!-- <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/snazzy.css" /> -->
	<!-- <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/default.min.css" /> -->
</svelte:head>

<div id="main-container">
	<Toasts />
	<div id="left-sidebar" class="editor-sidebar">
		<div id="lf-md-word_count">0 Words</div>
		<Seperator />
		<Metadata title="Date Created" subtitle={dayjs(data.postData.createdAt).format("DD/MM/YYYY — HH:mm")} showSeperator={false} />
	</div>
	<div id="editor-container">
		<div id="editor-header">
			<span id="title" role="textbox" contenteditable />
			<div id="editor-post-metadata">
				<h3 id="lf-author">Written by: {data.postData.l2w_author}</h3>
				<h3 id="lf-last_saved">
					Last Saved: <strong>{convertDate(new Date($lastSavedAt))}</strong>
				</h3>
			</div>
		</div>
		<div id="editor" />
		<!-- <CodeModal /> -->
	</div>
	<div id="right-sidebar" class="editor-sidebar">
		<Metadata title="Status" subtitle={convertToSentenceCase($postStatus)} showSeperator={true} />
		{#if $postStatus === "published"}
			<Metadata
				title="Published On"
				subtitle={dayjs(data.postData.l2w_wf_published_at).format("DD/MM/YYYY — HH:mm")}
				showSeperator={false}
			/>
		{/if}

		{#if $loading}
			<Loader />
		{:else}
			{@const isDraftOrUnpublished = $postStatus === "draft" || $postStatus === "unpublished"}
			<Button
				on:buttonClicked={() => publishPostFunction(isDraftOrUnpublished ? "stage" : "update")}
				buttonText={$postStatus !== "draft" ? "Update" : "Stage"}
				buttonAction="Stage"
				mouseOverText=""
				showMouseOverText={false}
			/>
			<Button
				on:buttonClicked={() => publishPostFunction($postStatus === "published" ? "unpublish" : "publish")}
				buttonText={$postStatus === "published" ? "Published" : "Publish"}
				buttonAction="Publish Post"
				mouseOverText="Unpublish"
				showMouseOverText={$postStatus === "published"}
			/>
		{/if}
	</div>
</div>

<style>
	#main-container {
		margin: 2em 3em;
		display: flex;
		flex-direction: row;
		justify-content: space-around;
	}

	#editor-header {
		border-bottom: 1px solid #ccc;
		max-width: 100%;
		overflow: clip;
		padding: 2em 0in 1em 0in;
	}

	#title {
		border: 0px;
		margin-bottom: 0.3em;
		/* border-bottom: 1px solid var(--border-colour); */
		font-size: 1.8em;
		font-weight: 700;
		line-height: 110%;
		font-family: "Switzer";
		display: flex;
		justify-content: left;
		align-items: center;
		text-align: left;
		width: 100%;
		max-width: 100%;
		background-color: #f8f8f8;
		resize: none;
		height: auto;
	}

	#title[contenteditable]:empty::before {
		content: "Untitled post";
		color: gray;
	}

	#title:focus {
		outline-width: 0;
	}

	#editor-container {
		border: 1px solid #ccc;
		background-color: #f8f8f8;
		display: flex;
		flex-direction: column;
		width: 210mm;
		height: 100%;
		padding: 0in 1.5in;
		margin: 0em 3em;
	}

	#editor {
		font-size: 0.6em;
		border: 0px solid #ccc;
		padding: 1.5em 0in 4em 0in;
	}

	#editor-post-metadata {
		font-size: 0.6em;
		font-weight: 300;
	}

	#editor-post-metadata > h3 {
		margin-bottom: 0px;
		font-size: 1em;
		font-weight: 500;
	}

	.editor-sidebar {
		position: -webkit-sticky;
		position: sticky;
		display: flex;
		flex-direction: column;
		align-self: flex-start;
		width: 7em;
	}

	#lf-md-word_count {
		font-weight: 700;
		font-size: 0.6em;
		margin-bottom: 0.5em;
	}
</style>
