import { Schema as MDBSchema, Types } from 'mongoose';
import type { IMuseSpotifyAuth, IMuseSpotify } from '../types/plugins/muse.types';
import type { ImagineInterface } from '../types/plugins/imagine.types';
import type { IFlowStateCollections, IFlowStateSites } from '../types/webflow.service';
import { secondsToMs } from '../util';
import type { ConnectToDbOptions } from '../types/db.service';
import { IS_ENV, MONGODB_DEFAULT_DATABASE, MONGODB_FALLBACK_LOCALLY } from '../globals';
import type { ILeft2Write, ILeft2WriteImages } from '../types/plugins/l2w.types';

export const MUSE_DB_CONNECTION_DEFAULTS: ConnectToDbOptions = {
    dbName: IS_ENV.production ? MONGODB_DEFAULT_DATABASE : "HelloImSiera",
    uri: process.env.MONGODB_DOMAIN,
    retryLimit: 3,
    retryTimeout: secondsToMs(5),
    localFallback: MONGODB_FALLBACK_LOCALLY,
};

export const WEBFLOW_DB_CONNECTION_DEFAULTS: ConnectToDbOptions = {
    dbName: IS_ENV.production ? MONGODB_DEFAULT_DATABASE : "WebflowCollectionsTestDB",
    uri: process.env.MONGODB_DOMAIN,
    retryLimit: 3,
    retryTimeout: secondsToMs(5),
    localFallback: MONGODB_FALLBACK_LOCALLY,
    setCurrentConnection: true
};

export const L2W_DB_CONNECTION_DEFAULTS: ConnectToDbOptions = {
    dbName: IS_ENV.production ? MONGODB_DEFAULT_DATABASE : "PrettyDaisy",
    uri: process.env.MONGODB_DOMAIN,
    retryLimit: 3,
    retryTimeout: secondsToMs(5),
    localFallback: MONGODB_FALLBACK_LOCALLY,
    setCurrentConnection: true
};

export const FlowStateSites = new MDBSchema<IFlowStateSites>({
    _id: Types.ObjectId,
    wf_site_name: {
        type: String,
        required: true
    },
    wf_site_id: {
        type: String,
        required: true
    },
    wf_site_database_id: {
        type: String,
        required: true
    },
    wf_site_local_site_id: {
        type: String,
        required: true
    },
    wf_site_site_preview: {
        type: String,
        required: true
    },
    wf_site_last_published_date: {
        type: Date,
        required: true
    },
    wf_site_site_collections: [{
        type: Types.ObjectId,
        required: true,
        ref: "webflow-collections"
    }]
}, { timestamps: true });

export const FlowStateCollections = new MDBSchema<IFlowStateCollections>({
    _id: Types.ObjectId,
    wf_collection_id: {
        type: String,
        required: true
    },
    wf_collection_name: {
        type: String,
        required: true
    },
    wf_collection_item_count: {
        type: Number,
        required: true
    },
    wf_collection_site_id: {
        type: String,
        required: true
    },
    wf_collection_database_id: {
        type: String,
        required: true
    },
    wf_collection_last_updated: {
        type: Date,
        required: true
    },
    wf_collection_created_on: {
        type: Date,
        required: true
    },
    wf_collection_local_id: {
        type: String,
        required: true
    },
    wf_collection_local_collection_name: {
        type: String,
        required: true
    },
    wf_collection_items: {
        type: [],
        required: true
    }
}, { timestamps: true });

export const Imagine = new MDBSchema<ImagineInterface>({
    _id: Types.ObjectId,
    source_image_name: {
        type: String,
        required: true
    },
    source_image_size: {
        type: Number,
        required: true
    },
    source_image_size_string: {
        type: String,
        required: false
    },
    export_image_name: {
        type: String,
        required: true
    },
    export_image_size: {
        type: Number,
        required: true
    },
    export_image_size_string: {
        type: String,
        required: false
    },
    image_category: {
        type: String,
        required: true,
        ref: "webflow-collections"
    },
    image_id: {
        type: String,
        required: true
    },
    image_metadata_string: {
        type: String,
        required: true
    },
    image_version_number: {
        type: String,
        required: true
    },
    image_processed_check: {
        type: Boolean,
        required: false
    },
    wf_uploaded: {
        type: Boolean,
        required: false
    },
    wf_item_collection_id: {
        type: String,
        required: false
    },
    wf_item_id: {
        type: String,
        required: false
    },
    wf_image_file_id: {
        type: String,
        required: false
    },
    wf_image_file_url: {
        type: String,
        required: false
    }
}, { timestamps: true });

export const Muse = new MDBSchema<IMuseSpotify>({
    _id: Types.ObjectId,
    sp_playlist_name: {
        type: String,
        required: true
    },
    sp_playlist_id: {
        type: String,
        required: true
    },
    sp_playlist_description: {
        type: String,
        required: false
    },
    sp_playlist_href: {
        type: String,
        required: true
    },
    sp_playlist_api_url: {
        type: String,
        required: true
    },
    sp_playlist_uri: {
        type: String,
        required: true
    },
    sp_playlist_total_tracks: {
        type: Number,
        required: true
    },
    sp_playlist_track_data: {
        type: [],
        required: true
    },
    sp_playlist_snapshot_id: {
        type: String,
        required: true
    },
    sp_playlist_collaborative: {
        type: Boolean,
        required: true
    },
    sp_playlist_owner: {
        type: Object,
        required: true
    },
    sp_playlist_local_id: {
        type: String,
        required: true
    }
}, { timestamps: true });

export const SpotifyAuth = new MDBSchema<IMuseSpotifyAuth>({
    sp_auth_access_token: {
        type: String,
        required: true
    },
    sp_auth_refresh_token: {
        type: String,
        required: true
    },
    sp_auth_expires_date: {
        type: Date,
        required: true
    },
    sp_auth_state: {
        type: String,
        required: true
    },
    sp_auth_authorized_at: {
        type: Date,
        required: true
    },
    sp_auth_refresh_token_changed: {
        type: Boolean,
        required: true
    },
    sp_auth_scope: {
        type: String,
        required: false
    },
    sp_auth_token_type: {
        type: String,
        required: false
    }
}, { timestamps: true });

export const left2Write = new MDBSchema<ILeft2Write>({
    l2w_author: {
        type: String,
        required: true
    },
    l2w_id: {
        type: String,
        required: true
    },
    l2w_description: {
        type: String,
        required: false
    },
    l2w_last_saved_at: {
        type: Date,
        required: true
    },
    l2w_plain_text: {
        type: String,
        required: false
    },
    l2w_wf_published_at: {
        type: Date,
        required: false
    },
    l2w_ql_deltas: {
        type: Object,
        required: false
    },
    l2w_wf_item_id: {
        type: String,
        required: false
    },
    l2w_raw_html: {
        type: String,
        required: false
    },
    l2w_slug: {
        type: String,
        required: false
    },
    l2w_wf_post_status: {
        type: String,
        required: false
    },
    l2w_title: {
        type: String,
        required: true
    },
    l2w_thumbnail: {
        type: String,
        required: false
    }
}, { timestamps: true });

export const left2WriteImages = new MDBSchema<ILeft2WriteImages>({
    l2w_image_conversion_date: {
        type: Date,
        required: true
    },
    l2w_image_conversion_file_name: {
        type: String,
        required: true
    },
    l2w_image_id: {
        type: String,
        required: true
    },
    l2w_image_original_file_name: {
        type: String,
        required: false
    },
    l2w_image_post_id: {
        type: String,
        required: true
    },
    l2w_image_url: {
        type: String,
        required: true
    }
}, { timestamps: true });