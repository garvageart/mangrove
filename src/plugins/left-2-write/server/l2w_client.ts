/* eslint-disable @typescript-eslint/ban-ts-comment */
import fastifyCors from '@fastify/cors';
import { DateTime } from "luxon";
import sharp from "sharp";
import * as io from 'socket.io';
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';
import type { Collection, Item } from "webflow-api/dist/api";
import { assetsBucket, fastifyClient } from '../../../config/clients.config';
import { L2W_DB_CONNECTION_DEFAULTS, left2Write, left2WriteImages } from "../../../config/db.config";
import { IS_ENV, IS_PROCESS_CHILD } from '../../../globals';
import { DatabaseService } from "../../../services/db.service";
import type { ImageUploadFileData } from "../../../types/plugins/l2w.editor.types";
import type { FlowStateL2W, ILeft2Write, ILeft2WriteImages, L2WOptions, PostAction, PostStatus } from '../../../types/plugins/l2w.types';
import { excludePropertiesFromObject, execChildProcess, generateRandomID, sleep, uploadToGCStorage } from '../../../util';
import PluginInstance from '../../plugin_instance';
import { L2W_SERVER_PORT, L2W_SERVER_URL } from '../l2w.constants';
import fastifySocketIO from "fastify-socket.io";
import type { DeltaOperation } from "quill";

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

    // TODO: Prohibit endpoints which require connecting to Webflow
    // if user is on localhost or is not connected to the network
    // to prevent publishing incorrect data and if there is no
    // valid internet connection
    async postServer() {
        fastifyClient.register(fastifyCors);
        fastifyClient.register(fastifySocketIO);

        fastifyClient.get('/posts', async (req, res) => {
            const posts = await this.dbs.model.find().lean().then(documents => documents.map(document => document));

            this.logger.info(`Sending all posts to client: ${req.ip}`);

            res.send({
                count: posts.length,
                posts
            });
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

                res.status(500).send({
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

            res.status(201).send(modifiedObject);
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

                switch (action) {
                    case 'publish': {
                        if (storedPost.l2w_wf_post_status === 'draft') {
                            res.status(400).send({
                                error: 'Post not staged'
                            });

                            return;
                        }

                        await this.dbs.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: 'published',
                            l2w_wf_published_at: new Date()
                        });

                        this.logger.info(`Post ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)} has been published to website`);
                        break;
                    }

                    case 'unpublish': {
                        await this.dbs.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: 'unpublished'
                        });

                        this.logger.info(`Post ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)} has been unpublished to website`);
                        break;
                    }
                }

                // Allows database to update data before data can be sent to client
                await sleep(3000);
                const actualUpdatedDoc = await this.dbs.model.findOne({ l2w_id: postID }).lean();

                let resStatus;

                if (action === 'publish' || action === 'stage') {
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
            const fileName = requestBodyJSON.metadata.name.split(".")[0].replaceAll(/\s/g, "_")
            const generatedName = `${fileName}-${imageID}-${imageGenDate.toFormat('dd_LL_y-HHmmss')}`;
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
                const uploadEvent = await uploadToGCStorage({
                    bucket: assetsBucket,
                    path: urlPath,
                    data: processedData
                })

                uploadEvent.on('finish', () => {
                    this.logger.info(`Upload to ${process.env.GCP_LF_ASSETS_BUCKET} storage finished successfully for ${generatedName}.${fileType}`);
                });

                res.send({
                    url: `http://assets.lesis.online/${urlPath}`,
                    id: imageID,
                    metadata: processedData.info
                });
            } catch (error) {
                this.logger.error(`An error occurred while uploading ${generatedName} to ${process.env.GCP_LF_ASSETS_BUCKET}:`, error);
                res.status(500);
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

        fastifyClient.ready().then(() => {
            // @ts-ignore
            fastifyClient.io.on('connection', (socket: io.Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, unknown>) => {
                if (IS_ENV.production) {
                    this.logger.info('Successfully connected to the Left-2-Write server from', socket.handshake.address);
                }

                socket.on("send-changes", async (delta: DeltaOperation) => {
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
        });

        fastifyClient.listen({ host: "0.0.0.0", port: L2W_SERVER_PORT }, (error) => {
            if (error) {
                this.logger.info('An error occured running the server:', error);
                return;
            }

            this.logger.info(`Leaf post server is running. Listening for requests at ${L2W_SERVER_URL}:${L2W_SERVER_PORT}`);
        });
    }

    // TODO: Deprecate all usage of this method
    async liveEditingServer() {
        const socketInstance = new this.client.Server({
            cors: {
                methods: ['GET', 'POST']
            },
            transports: ['polling', 'websocket']
        });

        this.socket = socketInstance;
        socketInstance.on('connection', (socket) => {
            this.logger.info('Successfully connected to the Left-2-Write server with');

            socket.on("send-changes", async (delta: DeltaOperation) => {
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

        if (IS_ENV.production) {
            // Using exec instead of fork shows the logger correctly in this instance,
            // since the SvelteKit server doesn't use the logger normal mangrove logger (written in TypeScript)
            execChildProcess('node src/plugins/left-2-write/server/l2w_svelte_server.js', this.logger);
        }

        if (!IS_ENV.production || IS_PROCESS_CHILD) {
            process.on('uncaughtException', (error, origin) => {
                this.logger.warn("An uncaught exception occurred:", error, origin);
            });
        }
    }
}