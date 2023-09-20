/// <reference types="spotify-api" />

import { Types } from "mongoose";
import { FlowStateSchema } from "../webflow.service";

export interface IMuseSpotify {
    _id: Types.ObjectId;
    sp_playlist_name: string;
    sp_playlist_id: string;
    sp_playlist_description: string | undefined;
    sp_playlist_href: string;
    sp_playlist_api_url: string;
    sp_playlist_uri: string;
    sp_playlist_total_tracks: number;
    sp_playlist_track_data: Array<SpotifyApi.TrackObjectFull>;
    sp_playlist_snapshot_id: string;
    sp_playlist_collaborative: boolean;
    sp_playlist_owner: SpotifyApi.UserObjectPublic;
    sp_playlist_local_id: string;
}

export interface IMuseSpotifyAuth {
    sp_auth_access_token: string,
    sp_auth_refresh_token: string,
    sp_auth_expires_date: Date,
    sp_auth_state: string,
    sp_auth_authorized_at: Date,
    sp_auth_refresh_token_changed: boolean;
    sp_auth_scope?: string;
    sp_auth_token_type?: string;
}

export interface AuthorizationCodeFlowResponse {
    code?: string;
    state: string;
    error?: string;
}

export interface MuseOptions {
    serverPort: number;
}

export interface FlowStateMuse extends FlowStateSchema {
    'playlist-description': string;
    'playlist-spotify-id': string;
    'playlist-spotify-href': string;
    'playlist-spotify-api-url': string;
    'playlist-spotify-uri': string;
    'playlist-spotify-total-tracks': number;
    'playlist-spotify-snapshot-id': string;
    'playlist-spotify-collaborative': boolean;
    'playlist-spotify-owner': string;
}