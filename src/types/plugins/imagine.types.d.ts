import mongoose from "mongoose";
import { OutputInfo } from "sharp";
import { FlowStateImageFile, FlowStateSchema } from "../webflow.service";
import { Item } from "webflow-api/dist/api";

export interface ImagineInterface {
    _id: mongoose.Types.ObjectId;
    source_image_name: string;
    source_image_size: number;
    source_image_size_string?: string;
    export_image_name: string;
    export_image_size: number;
    export_image_size_string?: string;
    export_image_exif_tags?: ExifReader.ExifTags;
    image_id: string;
    image_metadata_string: string;
    image_category: string;
    image_version_number: string;
    image_processing_quality: number;
    image_processed_check?: boolean;
    gc_uploaded?: boolean;
    gc_image_original_href?: string;
    gc_image_href?: string;
    wf_uploaded?: boolean;
    wf_item_collection_id?: string;
    wf_item_id?: string;
    wf_image_file_id?: string;
    wf_image_file_url?: string;
}

export interface ImagineOptions {
    processingQuality?: number;
}

export interface ImagineServerOptions {
    prettyPrintFastify: boolean;
    serverPort: number;
}

export interface ProcessedImagesMetadata {
    sourceName: string,
    sourcePath: string,
    sourceSize: number;
    sourceEXIFTags: ExifReader.ExifTags;
    sourceDateCreated: Date;
    category: string,
    exportImageID: string,
    exportMetadataString: string,
    exportFileName: string,
    exportFileVersionNumber: string,
    processedCheck: boolean;
}

export interface ProcessedImagesData {
    imageData: {
        imageBuffer: Buffer;
        imageInfo: OutputInfo;
    };
    metadata: ProcessedImagesMetadata;
}

export interface ImagineServerParams {
    name: string;
    category: string;
}

export interface FlowStateImagine extends FlowStateSchema implements Item {
    'photo-category': string;
    'photo-date': Date;
    'photo-file-path': string | URL;
    'photo-file-name': string;
    'photo-file': string | FlowStateImageFile | unknown;
}