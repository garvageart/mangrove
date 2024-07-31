import { socketStore } from "$lib/stores/socket";
import { DOMSerializer, Node, Schema } from "prosemirror-model";
import type { ILeft2Write, PostAction } from "../../../../../../types/plugins/l2w.types";
import { editorContents, editorStatus, editorView, lastSavedAt, postStatus } from "$lib/stores/editor";
import { dev } from "$app/environment";
import { page } from "$app/stores";
import type { PageData } from "./$types";
import { convertDate } from "../../../../l2w.util";
import { L2W_SERVER_HREF } from "../../../../l2w.constants";
import { addToast } from "left-2-write/lib/ui/notification_toast.store";
import { get } from "svelte/store";
import { PUBLIC_WEBSITE_DOMAIN_NAME, PUBLIC_WEBSITE_STAGING_DOMAIN_NAME } from "$env/static/public";

let documentWrites = 1;

export function attrsToObject(sourceElement: HTMLElement) {
	const attributeNodeArray = [...sourceElement.attributes];
	const attrs = attributeNodeArray.reduce((attrs, attribute) => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		attrs[attribute.name] = attribute.value;
		return attrs;
	}, {});

	return attrs;
}

export function objectToAttrs(targetElement: HTMLElement, attrs: object) {
	if (Object.keys(attrs).length === 0) {
		return;
	}

	for (const [key, value] of Object.entries(attrs)) {
		if (!value) {
			return;
		}

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		targetElement.setAttribute(key, value);
	}
}

export function setUpDocument(data: ILeft2Write) {
	const titleDiv = document.createElement("title");

	if (data.l2w_title.toLowerCase() !== "untitled post") {
		titleDiv.innerText = data.l2w_title;
	}

	const summary = document.createElement("summary");
	const lastSaved = document.createElement("last-saved");
	const author = document.createElement("author");

	summary.innerText = data.l2w_summary ? data.l2w_summary : "";
	author.innerText = `By ${data.l2w_author}`;
	lastSaved.innerText = convertDate(new Date(data.l2w_last_saved_at));

	const header = document.createElement("div");
	header.prepend(titleDiv, summary, author, lastSaved);

	const bodyDiv = document.createElement("div");
	if (data.l2w_raw_html) {
		const articleDiv = document.createElement("article");
		articleDiv.innerHTML = data.l2w_raw_html;

		// Remove all hard break tags as ProseMirror will handle rendering of break lines
		articleDiv.querySelectorAll("p").forEach((paragraph) => {
			// Idk, is the single '<br>' check redundant? Not bothered to find out right now
			if (paragraph.innerHTML === "<br>" || paragraph.innerHTML.includes("<br>")) {
				paragraph.innerHTML = "";
			}

			if (paragraph.innerHTML.includes('img')) {
				const selectedImageElement = paragraph.querySelector("img");
				const newImageElement = document.createElement("img");

				const attrs = attrsToObject(selectedImageElement);
				objectToAttrs(newImageElement, attrs);

				selectedImageElement.remove();
				articleDiv.insertBefore(newImageElement, paragraph);

				if (dev) {
					console.log(attrs);
				}
			}
		});

		bodyDiv.appendChild(articleDiv);
	}

	bodyDiv.prepend(header);

	if (dev) {
		console.log(bodyDiv);
	}

	return bodyDiv;
}

export async function saveDocument(data: Partial<ILeft2Write>) {
	const pmState = get(editorView).state;
	const loadedPageData = get(page).data as PageData;
	const socket = get(socketStore);

	const newSaveDate = new Date();
	lastSavedAt.set(newSaveDate);

	try {
		socket.on("connect", () => {
			socket.sendBuffer = [];
		});

		await socket.timeout(3000).emitWithAck("save-document", {
			l2w_id: loadedPageData.postData.l2w_id,
			l2w_last_saved_at: newSaveDate,
			l2w_pm_save_date: newSaveDate,
			l2w_pm_state: pmState,
			...data
		});
	} catch (error) {
		console.log("Server didn't acknowledge in time, retrying...");
		return saveDocument(data);
	}

	editorStatus.set('saved');
	setTimeout(() => editorStatus.set(get(postStatus)), 5000);

	if (dev) {
		console.log("Saving to database", newSaveDate, "\nDocument writes:", documentWrites++);
	}
}

export async function publishPost(action: PostAction) {
	const editorData = get(editorContents);
	const pageId = get(page).data.postData.l2w_id;

	saveDocument(editorData);
	editorStatus.set("publishing");

	const publishResponse = await fetch(`${L2W_SERVER_HREF}/publish/${pageId}?action=${action}`, {
		method: "POST"
	});

	const postData = (await publishResponse.json()) as ILeft2Write & { error: string; };

	if (publishResponse.ok && postData) {
		if (action === 'update' || action === 'stage') {
			postStatus.set('staged');
		}

		let toastMessage = `Post has been ${action}${action.charAt(action.length - 1) !== "e" ? "ed" : "d"}`;

		if (get(editorStatus) === 'published') {
			const postHref = dev ? PUBLIC_WEBSITE_STAGING_DOMAIN_NAME : PUBLIC_WEBSITE_DOMAIN_NAME;
			toastMessage += `\n${postHref}/${get(page).data.postData.l2w_slug}`;
		}

		postStatus.set(postData.l2w_wf_post_status);

		addToast({
			message: toastMessage
		});
	} else {
		addToast({
			message: `${publishResponse.status} — ${postData.error}`,
		});
	}

	editorStatus.set(get(postStatus));
}

export function nodeToElement(node: Node, schema: Schema) {
	const tempDiv = document.createElement("div");
	const fragment = DOMSerializer.fromSchema(schema).serializeFragment(node.content, {
		document
	});

	// Hack to fix hard breaks not rendering correctly
	fragment.querySelectorAll('p').forEach(node => {
		if (!node.textContent) {
			node.innerHTML = '<br>';
		}
	});

	// Terrible (and temporary) hack to place caption text from attributes inside element
	// until I can implement a NodeSpec which will properly do this
	fragment.querySelectorAll("figcaption").forEach(caption => {
		const attrs = attrsToObject(caption);
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const creditsText = attrs['data-credits'];

		if (!creditsText) {
			caption.remove();
			return;
		}

		caption.innerText = creditsText;
		caption.removeAttribute('data-credits');
	});

	fragment.querySelectorAll("img").forEach(image => {
		image.removeAttribute('data-credits');
		const imageAttrs = attrsToObject(image);

		for (const [key, value] of Object.entries(imageAttrs)) {
			if (!value) {
				image.removeAttribute(key);
			}
		}
	});

	tempDiv.appendChild(fragment);

	return tempDiv;
}