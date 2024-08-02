import type { Step } from "prosemirror-transform";
import type { FlowStateSchema } from "../webflow.service";
import type Delta from "quill-delta";

export type PostStatus = "draft" | "published" | "staged" | "unpublished";
export type PostAction = "unpublish" | "publish" | "stage" | "update";

export interface ILeft2WriteMenuOptions {
	title?: string;
	itemName: string;
	action: (event: CustomEvent) => void;
}

export type ILeft2WriteHistoryExtension = {
	l2w_history_uuid: string;
	l2w_history_date: Date;
	l2w_history_edited_by: string;
};
export type ILeft2WriteHistoryFormat = ILeft2WriteHistoryExtension & Omit<ILeft2Write, 'l2w_wf_published_on_staged_only' | 'l2w_post_history'>;
export type ILeft2WriteHistory = Array<ILeft2WriteHistoryFormat>;

export interface ILeft2Write {
	createdAt?: Date;
	updatedAt?: Date;
	l2w_id: string;
	l2w_title: string;
	l2w_thumbnail?: string;
	l2w_summary?: string;
	l2w_author: string;
	l2w_slug?: string;
	l2w_plain_text: string;
	l2w_raw_html: string;
	l2w_ql_deltas?: Delta;
	l2w_pm_state: object; // TODO: Create an interface for the serialized PM State
	l2w_pm_steps: Step[];
	l2w_last_saved_at: Date;
	l2w_quill_save_date: Date;
	l2w_pm_save_date: Date;
	l2w_wf_post_status?: PostStatus;
	l2w_wf_published_at?: Date;
	l2w_wf_item_id?: string;
	l2w_wf_published_on_staged_only?: boolean;
	l2w_post_history?: ILeft2WriteHistory;
}

export interface ILeft2WriteImages {
	l2w_image_id: string;
	l2w_image_url: string;
	l2w_image_post_id: string;
	l2w_image_original_file_name?: string;
	l2w_image_conversion_file_name: string;
	l2w_image_conversion_date: Date;
}

export interface FlowStateL2W extends FlowStateSchema {
	"post-author": string;
	"post-id": string;
	"post-last-saved-at": Date;
	"post-rich-text": string;
	"post-plain-text": string;
	"post-description"?: string;
	"post-thumbnail"?: string;
	"post-image-urls"?: string[];
}

export interface L2WOptions {
	port: number;
	origin?: string;
}