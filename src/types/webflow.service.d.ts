import { Types } from 'mongoose';
import { Item } from 'webflow-api/dist/api';

export interface IFlowStateSites {
    _id: Types.ObjectId,
    wf_site_name: string,
    wf_site_id: string,
    wf_site_database_id: string,
    wf_site_local_site_id: string,
    wf_site_site_preview: string,
    wf_site_last_published_date: Date;
    wf_site_site_collections: Types.ObjectId[];
}

export interface IFlowStateCollections {
    _id: Types.ObjectId,
    wf_collection_id: string,
    wf_collection_name: string,
    wf_collection_item_count: number,
    wf_collection_site_id: string,
    wf_collection_database_id: string,
    wf_collection_last_updated: Date,
    wf_collection_created_on: Date,
    wf_collection_local_id: string,
    wf_collection_local_collection_name: string;
    wf_collection_items: Item[];
}

export interface WebflowServiceOptions {
    collectionName?: string;
    collectionID?: string;
    siteID?: string;
}

export interface FlowStateImageFile {
    fileId: string;
    url: string;
}

export interface FlowStateSchema {
    _id?: string;
    name: string;
    slug: string;
    _archived: boolean;
    _draft: boolean;
}