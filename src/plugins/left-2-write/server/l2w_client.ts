/* eslint-disable @typescript-eslint/ban-ts-comment */
import fastifyCors from '@fastify/cors';
import { Storage } from "@google-cloud/storage";
import fs from "fs";
import { DateTime } from "luxon";
import sharp from "sharp";
import * as io from 'socket.io';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';
import stream from "stream";
import type { Collection, Item } from "webflow-api/dist/api";
import { fastifyClient } from '../../../config/clients.config';
import { L2W_DB_CONNECTION_DEFAULTS, left2Write, left2WriteImages } from "../../../config/db.config";
import { IS_ENV, IS_PROCESS_CHILD, URL_VALID_CHARACTERS } from '../../../globals';
import { DatabaseService } from "../../../services/db.service";
import type { ImageUploadFileData } from "../../../types/plugins/l2w.editor.types";
import type { FlowStateL2W, ILeft2Write, ILeft2WriteImages, L2WOptions, PostAction, PostStatus } from '../../../types/plugins/l2w.types';
import { excludePropertiesFromObject, generateRandomID, sleep } from '../../../util';
import PluginInstance from '../../plugin_instance';
import { L2W_SERVER_PORT, L2W_SERVER_URL } from '../l2w.constants';

export class L2WServer extends PluginInstance<FlowStateL2W, ILeft2Write, typeof io> {
    protected options: L2WOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: io.Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
    webflowCollection: Collection;

    constructor(options: L2WOptions) {
        super({
            collectionName: 'bouquet',
            colour: '#DA70D6',
            schema: left2Write,
            client: io,
            addOns: [
                new DatabaseService<ILeft2WriteImages>({
                    schema: left2WriteImages,
                    collectionName: "leaf-images"
                }),
            ]
        });

        this.options = options;

        if (!IS_ENV.production) {
            const leafClientSettings = Object.create(L2W_DB_CONNECTION_DEFAULTS);
            leafClientSettings.dbName = 'mangrove';

            this.dbs.createNewConnection(leafClientSettings)
                .then(connection => {
                    connection.on('open', () => {
                        this.logger.info('Opened connection to MongoDB for Leaf posts');
                    });

                    connection.on('disconnected', () => {
                        this.logger.warn('Leaf client has disconnected from MongoDB, continuously polling for reconnection in the background');
                    });
                });
            const leafImagesSettings = Object.create(L2W_DB_CONNECTION_DEFAULTS);
            leafImagesSettings.dbName = 'mangrove';
            // @ts-ignore
            this.addOns[0].createNewConnection(leafImagesSettings).then(connection => {
                connection.on('open', () => {
                    this.logger.info('Opened connection to MongoDB for Leaf images');
                });

                connection.on('disconnected', () => {
                    this.logger.warn('Leaf client has disconnected from MongoDB, continuously polling for reconnection in the background');
                });
            });
        }
    }

    private handlePostStatus(post: Item) {
        let postStatus: PostStatus;

        if (post._archived || post._draft) {
            postStatus = 'draft';
        }

        if ((post._archived || post._draft) && !post["published-on"]) {
            postStatus = 'unpublished';
        }

        if (new Date(post["updated-on"]).getTime() > new Date(post["published-on"]).getTime()) {
            postStatus = 'staged';
        }

        if (post["published-on"]) {
            postStatus = 'published';
        }

        return postStatus;
    }

    private async syncWebflowData() {
        const wfPosts = await this.webflowService.getCollectionItems(this.webflowCollection._id);

        for (const post of wfPosts) {
            const postStatus = this.handlePostStatus(post);

            this.dbs.updateDocument({ l2w_wf_item_id: post._id }, {
                l2w_wf_published_at: post["published-on"] ? new Date(post["published-on"]) : null,
                l2w_wf_post_status: postStatus,
                l2w_slug: post.slug
                // l2w_wf_item_id: post._id,
                // l2w_title: post.name,
                // l2w_raw_html: post["post-rich-text"],
            });
        }
    }

    // TODO: Prohibit endpoints which require connecting to Webflow
    // if user is on localhost or is not connected to the network
    // to prevent publishing incorrect data and if there is no
    // valid internet connection
    async postServer() {
        fastifyClient.register(fastifyCors);

        const webflowCollection = (await this.webflowService.getAllCollections()).find(collection => collection.name.toLowerCase().includes('posts'));
        this.webflowCollection = webflowCollection;
        await this.syncWebflowData();

        const gcStorage = new Storage({
            credentials: JSON.parse(fs.readFileSync(process.env.GCP_STORAGE_KEY_FILE).toString('utf-8'))
        });
        const lfBucket = gcStorage.bucket(process.env.GCP_LF_ASSETS_BUCKET);

        fastifyClient.get('/posts', async (req, res) => {
            const posts = await this.dbs.model.find().lean().then(documents => documents.map(document => document));

            this.logger.info(`Sending all posts to client: ${req.ip}`);

            res.send({
                count: posts.length,
                posts
            });
        });

        fastifyClient.put('/sync', (req) => {
            // @ts-ignore
            if (req.query.postID) {
                // @ts-ignore
                this.logger.info(`${this.pluginColour(req.query.postID)} is asking to sync to the database`);
            }

            try {
                this.syncWebflowData();
                this.logger.info('Webflow data has been synced to post databases');
            } catch (error) {
                this.logger.error('There was an error syncing Webflow data to post database', error);
            }
        });

        fastifyClient.get('/posts/:postID', async (req, res) => {
            //@ts-ignore
            const { postID } = req.params;
            const post = await this.dbs.model.findOne({ l2w_id: postID }).lean().then(document => {
                if (req.id) {
                    this.logger.info(`Sending post info to client: ${req.hostname}`);
                }

                return document;
            });

            res.send(post);
        });

        fastifyClient.delete('/posts/:postID', async (req, res) => {
            //@ts-ignore
            const { postID } = req.params;

            try {
                const deletedPost = await this.dbs.model.findOneAndDelete({ l2w_id: postID }).lean();
                this.logger.info(`Post ${this.pluginColour(`${deletedPost.l2w_id} (${deletedPost.l2w_title})`)} has been deleted from the database`);

                res.status(204);
            } catch (error) {

                res.send({
                    error: "There was an error deleting the post"
                });
            }
        });

        fastifyClient.post('/duplicate', async (req, res) => {
            //@ts-ignore
            const { id } = JSON.parse(req.body);

            const post = await this.dbs.model.findOne({ l2w_id: id }).lean();

            const modifiedObject = excludePropertiesFromObject(post, new Set(['updatedAt', 'createdAt', '__v', '_id'])) as Partial<ILeft2Write>;
            const newPostID = generateRandomID({ idLength: 32, numLength: 8 });
            const newTitle = modifiedObject.l2w_title + ' (Duplicated)';

            modifiedObject.l2w_id = newPostID;
            modifiedObject.l2w_title = newTitle;
            // This is so jank, please find a different way of doing this
            // @ts-ignore
            modifiedObject.l2w_pm_state.doc.content[0].content[0].content[0].text = newTitle;
            modifiedObject.l2w_last_saved_at = new Date();

            this.dbs.addDocument(modifiedObject as ILeft2Write);
            this.logger.info(`${post.l2w_id} has been duplicated into ${newPostID}`);

            res.send(modifiedObject);
        });

        fastifyClient.post('/posts', async (req, res) => {
            const requestData = req.body as string;
            const requestDataJSON = JSON.parse(requestData) as ILeft2Write;

            const postID = generateRandomID({ idLength: 32, numLength: 8 });
            requestDataJSON.l2w_id = postID;

            await this.dbs.addDocument(requestDataJSON)
                .then(document => {
                    this.logger.info(`New document created with ID: ${document.l2w_id}`);
                }).catch(error => {
                    this.logger.error(`Error creating document for ID: ${requestDataJSON.l2w_id}`, error);
                });

            res.send(postID);
        });

        fastifyClient.post('/publish/:postID', async (req, res) => {
            //@ts-ignore
            const { postID } = req.params;
            //@ts-ignore
            const action = req.query.action as PostAction;
            const storedPost = await this.dbs.model.findOne({ l2w_id: postID });

            try {
                let postItem;
                const webflowData = {
                    name: storedPost.l2w_title,
                    // There is definitely a better way to do this, wtf lmao?
                    slug: `${storedPost.l2w_title.toLowerCase()
                        .replaceAll("'", "")
                        .replaceAll(URL_VALID_CHARACTERS, '-')
                        .replaceAll('--', '-')}-${postID}`,
                    "post-id": postID,
                    "post-author": storedPost.l2w_author,
                    "post-last-saved-at": storedPost.l2w_last_saved_at,
                    "post-rich-text": storedPost.l2w_raw_html,
                    "post-plain-text": storedPost.l2w_plain_text,
                    "post-description": storedPost.l2w_summary ? storedPost.l2w_summary : storedPost.l2w_plain_text.substring(0, 250) + "...",
                };

                switch (action) {
                    case 'publish': {
                        if (storedPost.l2w_wf_post_status === 'draft') {
                            res.status(400).send({
                                error: 'Post not staged'
                            });

                            return;
                        }

                        postItem = await this.webflowService.updateItem(this.webflowCollection._id, storedPost.l2w_wf_item_id, {
                            ...webflowData,
                            _archived: false,
                            _draft: false
                        });

                        await this.webflowService.client.publishItems({
                            collectionId: this.webflowCollection._id,
                            itemIds: [storedPost.l2w_wf_item_id],
                            live: true
                        });

                        let wfPublishDomains: string[];
                        let wfPublishStagedOnly: boolean;

                        if (!IS_ENV.production) {
                            wfPublishDomains = [process.env.PUBLIC_WEBSITE_STAGING_DOMAIN_NAME];
                            wfPublishStagedOnly = true;
                        } else {
                            wfPublishDomains = [process.env.PUBLIC_WEBSITE_DOMAIN_NAME, `www.${process.env.PUBLIC_WEBSITE_DOMAIN_NAME}`];
                            wfPublishStagedOnly = false;
                        }

                        await this.webflowService.publishSite({
                            domains: wfPublishDomains
                        }).then(() => {
                            this.logger.info(`Post ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)} has been published to Webflow`);
                        });

                        const publishedItem = await this.webflowService.client.item({
                            collectionId: this.webflowCollection._id,
                            itemId: storedPost.l2w_wf_item_id,
                        });

                        await this.dbs.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: 'published',
                            l2w_wf_published_at: new Date(publishedItem['published-on']),
                            l2w_wf_published_on_staged_only: wfPublishStagedOnly,
                            l2w_slug: publishedItem
                        });

                        break;
                    }

                    case 'stage': {
                        postItem = await this.webflowService.addItem(this.webflowCollection._id, {
                            ...webflowData,
                            _archived: false,
                            _draft: false
                        });

                        await this.dbs.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: !postItem['published-on'] ? 'staged' : 'published',
                            l2w_slug: postItem.slug,
                            l2w_wf_item_id: postItem._id,
                        });

                        this.logger.info(`Post ${this.pluginColour(`${postItem.name} (${postItem['post-id']})`)} has been staged to Webflow`);
                        break;
                    }

                    case 'update': {
                        postItem = await this.webflowService.updateItem(this.webflowCollection._id, storedPost.l2w_wf_item_id, {
                            ...webflowData,
                            _archived: false,
                            _draft: false
                        });

                        await this.dbs.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: 'staged'
                        });

                        this.logger.info(`Post ${this.pluginColour(`${postItem.name} (${postItem['post-id']})`)} has been updated on Webflow`);
                        break;
                    }

                    case 'unpublish': {
                        await this.webflowService.client.publishItems({
                            collectionId: this.webflowCollection._id,
                            itemIds: [storedPost.l2w_wf_item_id],
                            live: false
                        });

                        await this.dbs.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: 'unpublished'
                        });

                        this.logger.info(`Post ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)} has been unpublished to Webflow`);
                        break;
                    }
                }

                // Allows database to update data before data can be sent to client
                await sleep(3000);
                this.syncWebflowData();
                const actualUpdatedDoc = await this.dbs.model.findOne({ l2w_id: postID }).lean();

                let resStatus;

                // eslint-disable-next-line no-constant-condition
                if (action === 'publish' || 'stage') {
                    resStatus = res.status(201);
                } else {
                    resStatus = res.status(200);
                }

                resStatus.send(actualUpdatedDoc);

            } catch (error) {
                if (IS_ENV.development || IS_ENV.debug || !IS_ENV.production) {
                    // This is here to show the whole error, because `console.log` doesn't show the entire error
                    // when it is not the first param
                    console.log(error);
                }

                this.logger.error(`Error creating blog post on Webflow for ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)}`, error);
                res.status(400).send({ error: 'Error creating blog post on Webflow' });
            }
        });

        fastifyClient.post('/images', async (req, res) => {
            // @ts-ignore
            const requestBodyJSON = JSON.parse(req.body) as ImageUploadFileData;
            const stringData = requestBodyJSON.data.split(',');
            const fileType = stringData[0].replace(';base64', '').split('/')[1].toLowerCase();

            const imageData = Buffer.from(stringData[1], 'base64url');
            const imageID = generateRandomID({ idLength: 32, numLength: 8 });
            const imageGenDate = DateTime.now();
            const generatedName = `${imageID}-${imageGenDate.toFormat('dd_LL_y-HHmmss')}`;
            const urlPath = `images/leaf/${generatedName}.${fileType}`;

            const imageDb = this.addOns[0] as DatabaseService<ILeft2WriteImages>;

            try {
                let baseMethod = sharp(imageData)
                    .rotate()
                    .resize(1000, null);

                switch (fileType) {
                    case 'png': {
                        baseMethod = baseMethod.png({
                            quality: 100
                        });

                        break;
                    }

                    case 'webp': {
                        baseMethod = baseMethod.png({
                            quality: 100
                        });

                        break;
                    }

                    case 'gif': {
                        baseMethod = baseMethod.gif();

                        break;
                    }

                    default: {
                        baseMethod = baseMethod.jpeg({
                            quality: 100
                        });

                        break;
                    }
                }

                const processedData = await baseMethod.withMetadata().toBuffer({ resolveWithObject: true });
                const bucketFile = lfBucket.file(urlPath);

                const passthroughStream = new stream.PassThrough();
                passthroughStream.write(processedData.data);
                passthroughStream.end();

                passthroughStream.pipe(bucketFile.createWriteStream()).on('finish', () => {
                    this.logger.info(`Upload to ${process.env.GCP_LF_ASSETS_BUCKET} storage finished successfully for ${generatedName}.${fileType}`);
                });

                res.send({
                    url: `http://assets.lesis.online/${urlPath}`,
                    id: imageID,
                    metadata: processedData.info
                });
            } catch (error) {
                this.logger.error(`An error occurred while uploading ${generatedName} to ${process.env.GCP_LF_ASSETS_BUCKET}:`, error);
                res.status(400);
            } finally {
                await imageDb.addDocument({
                    l2w_image_conversion_date: imageGenDate.toJSDate(),
                    l2w_image_conversion_file_name: `${generatedName}.${fileType}`,
                    l2w_image_id: imageID,
                    l2w_image_post_id: requestBodyJSON.metadata.postID,
                    l2w_image_url: urlPath
                });
            }
        });

        fastifyClient.listen({ host: IS_ENV.production ? "0.0.0.0" : "127.0.0.1", port: L2W_SERVER_PORT }, (error) => {
            if (error) {
                this.logger.info('An error occured running the server:', error);
            }

            this.logger.info(`Leaf post server is running. Listening for requests at ${L2W_SERVER_URL}:${L2W_SERVER_PORT}`);
        });
    }

    async liveEditingServer() {
        const socketInstance = new this.client.Server({
            cors: {
                methods: ['GET', 'POST']
            },
            transports: ['polling','websocket']
        });

        this.socket = socketInstance;
        socketInstance.on('connection', (socket) => {
            this.logger.info('Successfully connected to the Left-2-Write server with');

            socket.on("send-changes", async (delta) => {
                socket.broadcast.emit('receive-changes', delta);
            });

            socket.on("save-document", async (contents: ILeft2Write, acknowledge) => {
                await this.dbs.updateDocument({ l2w_id: contents.l2w_id }, contents)
                    .then((updatedDocument) => {
                        if (!updatedDocument) {
                            return;
                        }

                        this.logger.info(`Updated document data on database for post:`, updatedDocument.l2w_id);

                        if (contents.l2w_pm_state) {
                            acknowledge();
                        }
                    });
            });

            socket.on("receive-document", async (data: ILeft2Write) => {
                let post = await this.dbs.model.findOne({ l2w_id: data.l2w_id })?.lean();

                if (!post) {
                    post = (await this.dbs.addDocument(data)).toJSON();
                }

                socket.emit("document-data", post);
            });
        });

        socketInstance.listen(this.options.port);

        return socketInstance;
    }

    runL2WServer() {
        this.postServer();
        this.liveEditingServer();

        if (!IS_ENV.production || IS_PROCESS_CHILD) {
            process.on('uncaughtException', (error, origin) => {
                this.logger.warn("An uncaught exception occurred:", error, origin);
            });
        }
    }
}