import type { EditorState } from "prosemirror-state";
import { writable, type Writable } from "svelte/store";
import type { ILeft2Write, PostStatus } from "../../../../../types/plugins/l2w.types";
import type { EditorPostStatus } from "../../../../../types/plugins/l2w.editor.types";
import type { EditorView } from "prosemirror-view";

export const transactionCounter = writable(0);
export const hasUserInput = writable(false);
export const lastSavedAt = writable(null) as Writable<Date>;
export const postStatus = writable(null) as Writable<PostStatus>;

export const editorStatus = writable(null) as Writable<EditorPostStatus>;
export const editorState = writable(null) as Writable<EditorState>;
export const editorView = writable(null) as Writable<EditorView>;
export const editorContents = writable({}) as Writable<Partial<ILeft2Write>>;

export const showMenu = writable(null) as Writable<boolean>;