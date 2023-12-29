import ExifReader from 'exifreader';
import fs from 'fs';
import mkdirp, { mkdirpSync } from 'mkdirp';
import { Types } from 'mongoose';
import path from 'path';
import sharp from 'sharp';
import PluginInstance from '../plugin_instance';
import { Imagine } from '../../config/db.config';
import { APP_VERSION, FORMATTED_DATES, IS_ENV, MONGODB_DEFAULT_DATABASE, MONGODB_FALLBACK_LOCALLY } from '../../globals';
import type { FlowStateImagine, ImagineInterface, ImagineOptions, ProcessedImagesData, ProcessedImagesMetadata } from '../../types/plugins/imagine.types';
import type { FlowStateImageFile } from '../../types/webflow.service';
import { bytesToMB, convertEXIFDateTime, forkChildProcess, makePID, removeItemsFromArray, secondsToMs, sleep } from '../../util';
import type { Item } from 'webflow-api/dist/api';

export class ImaginePlugin extends PluginInstance<FlowStateImagine, ImagineInterface, typeof sharp> {
    protected options: ImagineOptions;
    protected baseDirectory: string;
    sourceDirectory: string;
    exportDirectory: string;
    exportFiles: string[] | undefined;
    categories: string[];

    constructor(options?: ImagineOptions) {
        super({
            colour: "#99CC00",
            schema: Imagine,
            collectionName: "imagine-files",
            client: sharp
        });

        this.options = options;

        this.baseDirectory = path.join('public', 'images');

        // Handle source images
        this.sourceDirectory = path.join(this.baseDirectory, 'source');
        mkdirpSync(this.sourceDirectory);

        this.categories = fs.readdirSync(this.sourceDirectory);

        // Handle exported images
        this.exportDirectory = path.join(this.baseDirectory, 'export', APP_VERSION.versionString);
        mkdirpSync(this.exportDirectory);

        this.exportFiles = fs.readdirSync(this.exportDirectory);

        this.initializeMongoDBConnection({
            dbName: IS_ENV.production ? MONGODB_DEFAULT_DATABASE : "WebflowCollectionsTestDB",
            uri: process.env.MONGODB_DOMAIN,
            retryLimit: 3,
            retryTimeout: secondsToMs(5),
            localFallback: MONGODB_FALLBACK_LOCALLY
        });
    }

    createCategoryDirectories(categories: string[]) {
        for (const category of categories) {
            if (this.categories.includes(category)) {
                this.logger.info(`${this.pluginColour(category)} image directory already exists on disk`);
                continue;
            }

            const categoryDirectory = path.resolve(this.sourceDirectory, category);

            this.logger.info(`Creating image directory ${this.pluginColour(category)} on disk at ${categoryDirectory}...`);
            mkdirpSync(categoryDirectory);
        }
    }

    async processor(directories: string[], retryLimit = 3) {
        const processedDataArray: ProcessedImagesData[] = [];
        const failedImages: ProcessedImagesMetadata[] = [];

        const processingQuality = this.options.processingQuality;
        const dbProcessedImages = await this.dbs.model.find();

        const processedImages = dbProcessedImages.map(document => document.source_image_name);
        const exportedImages = dbProcessedImages.map(document => document.export_image_name);

        const kProcessImage = async (imageBuffer: Buffer, photoDate: Date) => {
            const bufferAndOutputData = await this.client(imageBuffer)
                .rotate()
                .resize(2200, null)
                .jpeg({
                    quality: processingQuality
                })
                .withMetadata({
                    exif: {
                        IFD0: {
                            Copyright: `Copyright © ${photoDate.getFullYear()} Les. All Rights Reserved.`,
                            Artist: 'Les'
                        }
                    }
                })
                .toBuffer({ resolveWithObject: true });

            return bufferAndOutputData;
        };


        for (const directory of directories) {
            this.logger.info(`Starting images processing at ${processingQuality}% for ${this.pluginColour(directory)}`);

            const sourceDirectory = path.join(this.sourceDirectory, directory);
            const exportDirectory = path.join(this.exportDirectory, directory);
            const currentDbCategory = dbProcessedImages.filter(document => document.image_category === directory);

            if (!fs.existsSync(exportDirectory)) {
                this.logger.info(`Creating export directory ${exportDirectory}`);
                mkdirp.sync(exportDirectory);

                if (fs.readdirSync(sourceDirectory).length === 0) {
                    this.logger.info(`No images to process in ${sourceDirectory}. Moving on...`);
                    continue;
                }
            }

            const sourceFiles = fs.readdirSync(sourceDirectory);
            const exportFiles = fs.readdirSync(exportDirectory);

            if (sourceFiles.length === 0) {
                this.logger.info(`There are no images to process for ${this.pluginColour(directory)}. Moving onto the next category...`);
                continue;
            }

            for (const file of exportFiles) {
                if (!exportedImages.includes(file)) {
                    this.logger.info(`${this.pluginColour(file)} does not exist in the database, deleting file from disk`);

                    await this.dbs.deleteDocument({ export_image_name: file })
                        .then(() => this.logger.info(`${this.pluginColour(file)} has been deleted from the database`))
                        .catch(error => this.logger.error(`There was an error deleting ${this.pluginColour(file)} from the database`, error));

                    fs.rmSync(path.join(exportDirectory, file), { maxRetries: 10, retryDelay: 500 });

                    this.logger.info(`${this.pluginColour(file)} has been deleted from this ${exportDirectory}`);
                }
            }

            for (const image of currentDbCategory) {
                const fileName = image.export_image_name;

                if (!exportFiles.includes(fileName)) {
                    this.logger.info(`${this.pluginColour(fileName)} does not exist on the disk, deleting from database`);

                    await this.dbs.deleteDocument({ export_image_name: fileName })
                        .then(() => this.logger.info(`${this.pluginColour(fileName)} has been deleted from the database`))
                        .catch(error => this.logger.error(`There was an error deleting ${this.pluginColour(fileName)} from the database`, error));
                }
            }

            for (const file of sourceFiles) {
                // Source file data
                const sourceName = file;
                const sourceCategoryDirectory = path.resolve(this.sourceDirectory, directory);
                const sourcePath = path.resolve(sourceCategoryDirectory, sourceName);
                const sourceBuffer = fs.readFileSync(sourcePath);
                const sourceStats = fs.statSync(sourcePath);
                const sourceSize = sourceStats.size;
                const imageCategory = directory.replaceAll("-", "");

                // this.logger.debug(false, 'Current source image:', sourceName);
                // this.logger.debug(false, 'Is image stored in database', processedImages.includes(sourceName));

                // Check if image has been processed already
                if (processedImages.includes(sourceName)) {
                    this.logger.info(`${this.pluginColour(sourceName)} has already been processed`);
                    continue;
                }

                // Semantic version number
                const versionNumber = APP_VERSION.getAppVersion().join('');

                // EXIF Data
                const sourceEXIFTags = ExifReader.load(sourceBuffer, { expanded: true }).exif;
                const sourceEXIFDate = sourceEXIFTags?.DateTimeOriginal?.description ?? sourceEXIFTags?.DateTime?.description;
                const sourceDateCreated = convertEXIFDateTime(sourceEXIFDate) ?? sourceStats.birthtime;

                // Export file data
                const exportImageID = makePID(16);
                const exportMetadataString = `${versionNumber}_${exportImageID}${processingQuality}${FORMATTED_DATES.CURRENT_DATETIME_FILE()}`;
                const exportDomainName = process.env.PUBLIC_WEBSITE_DOMAIN_NAME.replaceAll(".", "");
                const exportFileName = `${exportDomainName}-${imageCategory}-${exportMetadataString}`;

                const exportMetadata: ProcessedImagesMetadata = {
                    sourceName,
                    sourcePath,
                    sourceSize,
                    sourceDateCreated,
                    sourceEXIFTags,
                    category: directory,
                    exportImageID,
                    exportMetadataString,
                    exportFileName,
                    exportFileVersionNumber: APP_VERSION.versionString,
                    processedCheck: false
                };

                const kRunProcessor = async () => {
                    const processedImageData = await kProcessImage(sourceBuffer, sourceDateCreated);
                    exportMetadata.processedCheck = true;

                    processedDataArray.push({
                        imageData: {
                            imageBuffer: processedImageData.data,
                            imageInfo: processedImageData.info,
                        },
                        metadata: exportMetadata
                    });

                    this.logger.info(`${this.pluginColour(sourceName)} has been added to the image array`);
                };

                try {
                    this.logger.info(`Processing image file ${this.pluginColour(`${sourceName} (${bytesToMB(sourceSize)}MB)`)} from "${path.relative(process.cwd(), sourceCategoryDirectory)}"...`);
                    await kRunProcessor();
                } catch {
                    let retryCounter = 0;
                    this.logger.error(`There was an error processing ${this.pluginColour(sourceName)}. Retrying...`);

                    while (retryCounter !== retryLimit) {
                        this.logger.info(`Retrying to process ${this.pluginColour(sourceName)}...`);

                        setTimeout(async () => await kRunProcessor(), secondsToMs(5));

                        retryCounter++;
                    }

                    const isRetryable = retryLimit <= retryCounter;

                    if (!isRetryable) {
                        this.logger.warn(`${this.pluginColour(sourceName)} failed to be processed after retrying ${retryLimit} times. Moving onto the next image...`);
                        failedImages.push(exportMetadata);
                    }
                }
            }

        }

        return processedDataArray;
    }

    async exportImages(processedDataArray: ProcessedImagesData[]) {
        if (processedDataArray.length === 0) {
            this.logger.info('No processed images to export');
            return;
        }

        this.logger.info(`Exporting images to files...`);
        const failedImages: ProcessedImagesMetadata[] = [];

        for (const data of processedDataArray) {
            const buffer = data.imageData.imageBuffer;
            const exportFileName = `${data.metadata.exportFileName}.${data.imageData.imageInfo.format}`;
            const exportCategoryDirectory = path.resolve(this.exportDirectory, data.metadata.category);
            const exportFilePath = path.resolve(exportCategoryDirectory, exportFileName);

            mkdirpSync(exportCategoryDirectory);

            await this.client(buffer)
                .withMetadata({
                    exif: {
                        IFD0: {
                            Copyright: `Copyright © ${data.metadata.sourceDateCreated.getFullYear()} Les. All Rights Reserved.`,
                            Artist: 'Les'
                        }
                    }
                })
                .toFile(exportFilePath)
                .then(async outputInfo => {
                    const exportSizeString = bytesToMB(outputInfo.size) + 'MB';
                    const sourceSizeString = bytesToMB(data.metadata.sourceSize) + 'MB';

                    this.logger.info(`${this.pluginColour(`${exportFileName} (${exportSizeString})`)} has been exported to "${path.relative(process.cwd(), exportCategoryDirectory)}"`);

                    await this.dbs.addDocument({
                        _id: new Types.ObjectId(),
                        image_id: data.metadata.exportImageID,
                        image_category: data.metadata.category,
                        image_metadata_string: data.metadata.exportMetadataString,
                        image_version_number: data.metadata.exportFileVersionNumber,
                        image_processing_quality: this.options.processingQuality,
                        image_processed_check: data.metadata.processedCheck,
                        export_image_name: exportFileName,
                        export_image_size: outputInfo.size,
                        export_image_size_string: exportSizeString,
                        source_image_name: data.metadata.sourceName,
                        source_image_size: data.metadata.sourceSize,
                        source_image_size_string: sourceSizeString,
                        export_image_exif_tags: data.metadata.sourceEXIFTags
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                    }).then(document => this.logger.info(`${this.pluginColour(document.export_image_name)} has been saved to the database`))
                        .catch(error => this.logger.error('An error occured adding the processed image to the database:', error));

                })
                .catch(err => {
                    this.logger.error(`There was an error exporting ${exportFileName}...`, err);
                    failedImages.push(data.metadata);
                });
        }

        return failedImages;
    }

    async uploadImages(options = { retryLimit: 3 }) {
        // At some point, there will be only one Webflow Collection used for all images
        // Find the right Webflow Collection(s) to upload images, likely by using exceptions
        // and filtering and only uploading to the relevant collections.
        // Maybe fetch the collections locally to reduce making unnecessary API calls

        // NOTE - 26/05/2023: This code runs so EXTREMELY slowly.
        // Make upload to Webflow run asynchronously and handle any other work in the meantime

        const webflowCollections = await this.webflowService.getAllCollections();
        const photographyCollection = webflowCollections.find(collection => collection.name.toLowerCase().includes('photography'));
        const visualArtsCollection = webflowCollections.find(collection => collection.name.toLowerCase().includes('visual'));
        const localDbFiles = await this.dbs.model.find({ image_processed_check: true });
        const wfSiteInfo = await this.webflowService.getSite();
        const exportDirectory: string[] = removeItemsFromArray(this.exportDirectory.split(path.sep), 'public');

        let webflowCollectionImageFileNames: string[];
        let webflowCollectionImageIDs: string[];
        let photoCategory: string;

        for (let FI = 0; FI < localDbFiles.length; FI++) {
            const imageDocument = localDbFiles[FI];

            if (photoCategory !== imageDocument.image_category) {
                photoCategory = imageDocument.image_category;

                const currentCollection = photoCategory.toLowerCase().includes('visual') ? visualArtsCollection : photographyCollection;

                webflowCollectionImageFileNames = (await this.webflowService.getCollectionItems(currentCollection._id)).map(item => item['photo-file-name']);
                webflowCollectionImageIDs = (await this.webflowService.getCollectionItems(currentCollection._id)).map(item => item['name']);
            }

            const currentCollection = photoCategory.toLowerCase().includes('visual') ? visualArtsCollection : photographyCollection;

            const photoFileName = imageDocument.export_image_name;
            const photoFilePath = path.join(...this.exportDirectory.split(path.sep), photoCategory, photoFileName);
            const photoURLPath = path.posix.join(...exportDirectory, photoCategory, photoFileName);
            const photoURL = `${process.env.ASSETS_SERVER_URL}/${photoURLPath}`;

            const photoLocalIDDocument = localDbFiles.find(document => document.export_image_name === photoFileName);

            const photoLocalID = photoLocalIDDocument.image_id;

            const photoBuffer = fs.readFileSync(photoFilePath);
            const photoStats = fs.statSync(photoFilePath);

            // EXIF Parameters
            const photoEXIFTags = ExifReader.load(photoBuffer, { expanded: true }).exif;
            const photoEXIFDate = photoEXIFTags?.DateTimeOriginal?.description ?? photoEXIFTags?.DateTime?.description;
            const photoDate = convertEXIFDateTime(photoEXIFDate) ?? photoStats.birthtime;

            if (webflowCollectionImageFileNames.includes(imageDocument.export_image_name) ||
                webflowCollectionImageIDs.includes(imageDocument.image_id)) {
                this.logger.info(`${imageDocument.export_image_name} already exists on Webflow Collection ${this.pluginColour(currentCollection.name)}`);
                continue;
            } else {
                this.logger.info(`Uploading ${this.pluginColour(photoFileName)} to Webflow Collection ${currentCollection.name} (${currentCollection._id})`);
            }

            let isUploadedToWebflow = false;
            let webflowItem: FlowStateImagine & Item;

            const createItem = async () => {
                this.logger.info(`Fetching ${this.pluginColour(photoURL)} from server...`);

                webflowItem = await this.webflowService.addItem(currentCollection._id, {
                    name: photoLocalID,
                    slug: `${photoCategory.replaceAll('-', '_')}-${photoLocalID}`,
                    _draft: false,
                    _archived: false,
                    "photo-category": photoCategory.replaceAll('-', ' '),
                    "photo-date": photoDate,
                    "photo-file": photoURL,
                    "photo-file-name": photoFileName,
                    "photo-file-path": photoFilePath.split(path.sep).join(path.posix.sep)
                }).then(item => {
                    this.logger.info(`${this.pluginColour(item['photo-file-name'])} (${item._id}) has been uploaded to Webflow Collection ${this.pluginColour(currentCollection.name)}`);
                    isUploadedToWebflow = true;

                    return item;
                });
            };

            try {
                await createItem();
            } catch (error) {
                this.logger.error(`There was an error adding ${photoFileName} to Webflow`, this.logger.logError(error));

                for (let counter = 0; counter < options.retryLimit; counter++) {
                    this.logger.info(`Retrying upload to Webflow for ${photoFileName} in 2 seconds...`);

                    await sleep(2000);
                    await createItem();

                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    if (isUploadedToWebflow === true) {
                        break;
                    }
                }

            } finally {
                const webflowItemImageData = webflowItem['photo-file'] as FlowStateImageFile;

                await this.dbs.updateDocument({ export_image_name: photoFileName }, {
                    wf_uploaded: isUploadedToWebflow,
                    wf_item_collection_id: currentCollection._id,
                    wf_item_id: webflowItem._id,
                    wf_image_file_id: webflowItemImageData.fileId,
                    wf_image_file_url: `https://uploads-ssl.webflow.com/${wfSiteInfo.database}/${webflowItemImageData.fileId}_${photoFileName}`
                }).then((document) => this.logger.info(`${this.pluginColour(document.export_image_name)} has been updated on the database`))
                    .catch(error => this.logger.error(`There was an error updating ${photoFileName} on the database`, this.logger.logError(error)));
            }
        }

        this.logger.info('Upload to Webflow has been completed');
    }

    // async removeImages() {
    //     await this.initializeMongoDBConnection({
    //         dbName: IS_ENV.production ? MONGODB_DEFAULT_DATABASE : "WebflowCollectionsTestDB",
    //         uri: process.env.MONGODB_DOMAIN,
    //         retryLimit: 3,
    //         retryTimeout: secondsToMs(5),
    //         localFallback: MONGODB_FALLBACK_LOCALLY
    //     });

    //     const webflowCollections = await this.webflowService.getAllCollections();
    //     const photographyCollection = webflowCollections.find(collection => collection.name.toLowerCase().includes('photography'));
    //     const visualArtsCollection = webflowCollections.find(collection => collection.name.toLowerCase().includes('visual'));
    //     const localDbFiles = await this.dbs.model.find({ image_processed_check: true });

    //     for (const imageDocument of localDbFiles) {
    //         const photoFileName = imageDocument.export_image_name;
    //         const photoCategory = imageDocument.image_category;
    //         const exportDirectoryPath = path.join(...this.exportDirectory.split(path.sep), photoCategory);
    //         const photoSourceDirectoryFiles = fs.readdirSync(path.join(this.sourceDirectory, photoCategory));
    //         const photoExportDirectoryFiles = fs.readdirSync(exportDirectoryPath);
    //         const photoFilePath = path.join(...this.exportDirectory.split(path.sep), photoCategory, photoFileName);
    //         const currentCollection = photoCategory.toLowerCase().includes('visual') ? visualArtsCollection : photographyCollection;
    //         const webflowCollectionImages = (await this.webflowService.getCollectionItems(currentCollection._id)).map(item => item['photo-file-name']);

    //         // Check if the image doesn't exist
    //         // - in the source directory 
    //         // - in the export directory
    //         // - on Webflow

    //         // - Images that don't exist in the database need to be deleted from everywhere 
    //         // - Images that don't exist in the source directory anymore, need to be deleted from everywhere
    //         // - Images that don't exist in the export directory but exist on Webflow, must be archived
    //         // - Images that don't exist in the export directory and the database but exist on Webflow and the source directory, must be
    //         // deleted from Webflow
    //         // - Images/items that exist on Webflow but don't exist on in database or exported files needs to be   
    //         // deleted from Webflow

    //     }
    // }

    async runImagine() {
        const directories = this.categories;
        const processedImages = await this.processor(directories);
        const failedImages = await this.exportImages(processedImages);

        if (failedImages && failedImages.length !== 0) {
            this.logger.warn(`These images failed to be processed`, failedImages);
        }

        const imageServer = forkChildProcess('src/plugins/imagine/imagine_server.ts', ['child'], {
            execArgv: ['--loader', 'tsx'],
            cwd: process.cwd(),
        }, this.logger);

        imageServer.on('spawn', async () => {
            this.logger.info('Image server launched successfully');

            await this.uploadImages();

            imageServer.kill();

            imageServer.on('close', () => {
                this.logger.info('Image server has been closed successfully');
            });
        });
    }
}