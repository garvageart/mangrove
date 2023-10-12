import type { FlowStateSchema } from "../webflow.service";
import type Delta from 'quill-delta';

export type PostStatus = "draft" | "published" | "staged" | "unpublished";
export type PostAction = "unpublish" | "publish" | "stage" | "update";

export interface ILeft2Write {
    createdAt: Date;
    updatedAt: Date;
    l2w_id: string;
    l2w_title: string;
    l2w_thumbnail?: string;
    l2w_description?: string;
    l2w_author: string;
    l2w_slug?: string;
    l2w_plain_text: string;
    l2w_raw_html: string;
    l2w_ql_deltas: Delta;
    l2w_last_saved_at: Date;
    l2w_wf_post_status?: PostStatus;
    l2w_wf_published_at?: Date;
    l2w_wf_item_id?: string;
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