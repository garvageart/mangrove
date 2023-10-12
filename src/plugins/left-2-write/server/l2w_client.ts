/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as io from 'socket.io';
import PluginInstance from '../../plugin_instance';
import type { FlowStateL2W, ILeft2Write, ILeft2WriteImages, L2WOptions, PostAction } from '../../../types/plugins/l2w.types';
import { L2W_DB_CONNECTION_DEFAULTS, left2Write, left2WriteImages } from "../../../config/db.config";
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { fastifyClient } from '../../../config/clients.config';
import { L2W_SERVER_PORT, L2W_SERVER_URL } from '../l2w.constants';
import fastifyCors from '@fastify/cors';
import { Storage } from "@google-cloud/storage";
import { generateRandomID, sleep } from '../../../util';
import { IS_ENV, URL_VALID_CHARACTERS } from '../../../globals';
import sharp from "sharp";
import stream from "stream";
import fs from "fs";
import dayjs from "dayjs";
import { DatabaseService } from "../../../services/db.service";
import { generatePostDescription } from "../l2w.util";

export class L2WServer extends PluginInstance<FlowStateL2W, ILeft2Write, typeof io> {
    protected options: L2WOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: io.Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

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
            this.dbs.createNewConnection(L2W_DB_CONNECTION_DEFAULTS)
                .then(connection => {
                    connection.on('open', () => {
                        this.logger.info('Opened connection to MongoDB for Leaf posts');
                    });
                });
        }
    }

    async postServer() {
        fastifyClient.register(fastifyCors);
        const webflowCollection = (await this.webflowService.getAllCollections()).find(collection => collection.name.toLowerCase().includes('posts'));

        const gcStorage = new Storage({
            credentials: JSON.parse(fs.readFileSync(process.env.GCP_STORAGE_KEY_FILE).toString('utf-8'))
        });
        const lfBucket = gcStorage.bucket(process.env.GCP_LF_ASSETS_BUCKET);

        fastifyClient.get('/posts', async (req, res) => {
            const posts = await this.dbs.model.find().then(documents => {
                this.logger.info(`Sending post info to client: ${req.ip}`);
                return documents.map(document => document.toJSON());
            });

            res.send({
                count: posts.length,
                posts
            });
            return;
        });

        fastifyClient.get('/posts/:postID', async (req, res) => {
            //@ts-ignore
            const { postID } = req.params;
            const post = await this.dbs.model.findOne({ l2w_id: postID }).then(document => {
                this.logger.info(`Sending post info to client: ${req.ip}`);
                return document;
            });


            res.send(post);
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

                switch (action) {
                    case 'publish': {
                        if (storedPost.l2w_wf_post_status === 'draft') {
                            res.status(400).send({
                                error: 'Post not staged'
                            });

                            return;
                        }

                        await this.webflowService.client.publishItems({
                            collectionId: webflowCollection._id,
                            itemIds: [storedPost.l2w_wf_item_id],
                            live: true
                        });

                        await this.webflowService.publishSite({
                            domains: IS_ENV.production ? [process.env.WEBSITE_DOMAIN_NAME, `www.${process.env.WEBSITE_DOMAIN_NAME}`] : [process.env.WEBSITE_STAGING_DOMAIN_NAME]
                        }).then(() => {
                            this.logger.info(`Post ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)} has been published to Webflow`);
                        });

                        const publishedItem = await this.webflowService.client.item({
                            collectionId: webflowCollection._id,
                            itemId: storedPost.l2w_wf_item_id,
                        });

                        await this.dbs.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: 'published',
                            l2w_wf_published_at: new Date(publishedItem['published-on'])
                        });

                        break;
                    }

                    case 'stage': {
                        postItem = await this.webflowService.addItem(webflowCollection._id, {
                            name: storedPost.l2w_title,
                            slug: `${storedPost.l2w_title.toLowerCase()
                                .replaceAll("'", "")
                                .replaceAll(URL_VALID_CHARACTERS, '-')}-${postID}`,
                            "post-id": postID,
                            "post-author": storedPost.l2w_author,
                            "post-last-saved-at": storedPost.l2w_last_saved_at,
                            "post-rich-text": storedPost.l2w_raw_html,
                            "post-plain-text": storedPost.l2w_plain_text,
                            "post-description": generatePostDescription(storedPost.l2w_plain_text, 250) + "...",
                            _archived: false,
                            _draft: false
                        });

                        await this.dbs.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: !postItem['published-on'] ? 'staged' : 'published',
                            l2w_slug: postItem.slug,
                            l2w_wf_item_id: postItem._id
                        });

                        this.logger.info(`Post ${this.pluginColour(`${postItem.name} (${postItem['post-id']})`)} has been staged to Webflow`);
                        break;
                    }

                    case 'update': {
                        postItem = await this.webflowService.updateItem(webflowCollection._id, storedPost.l2w_wf_item_id, {
                            name: storedPost.l2w_title,
                            slug: `${storedPost.l2w_title.toLowerCase()
                                .replaceAll(URL_VALID_CHARACTERS, '-').replaceAll("'", "")}-${postID}`
                            ,
                            "post-id": postID,
                            "post-author": storedPost.l2w_author,
                            "post-last-saved-at": storedPost.l2w_last_saved_at,
                            "post-rich-text": storedPost.l2w_raw_html,
                            "post-plain-text": storedPost.l2w_plain_text,
                            "post-description": generatePostDescription(storedPost.l2w_plain_text, 250) + "...",
                            _archived: false,
                            _draft: false
                        });

                        this.logger.info(`Post ${this.pluginColour(`${postItem.name} (${postItem['post-id']})`)} has been updated on Webflow`);
                        break;
                    }

                    case 'unpublish': {
                        await this.webflowService.client.publishItems({
                            collectionId: webflowCollection._id,
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

                await sleep(3000);
                const actualUpdatedDoc = await this.dbs.model.findOne({ l2w_id: postID });

                let resStatus;

                // eslint-disable-next-line no-constant-condition
                if (action === 'publish' || 'stage') {
                    resStatus = res.status(201);
                } else {
                    resStatus = res.status(200);
                }

                resStatus.send(actualUpdatedDoc);

            } catch (error) {
                console.log(error);
                this.logger.error(`Error creating blog post on Webflow for  ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)}`, error);
                res.status(400);
            }
        });

        fastifyClient.post('/images', async (req, res) => {
            // @ts-ignore
            const requestBodyJSON = JSON.parse(req.body) as { dataURL: string, postID: string; };
            const stringData = requestBodyJSON.dataURL.split(',') as string[];
            const fileType = stringData[0].replace(';base64', '').split('/')[1].toLowerCase();

            const imageData = Buffer.from(stringData[1], 'base64url');
            const imageID = generateRandomID({ idLength: 32, numLength: 8 });
            const imageGenDate = dayjs();
            const generatedName = `${imageID}-${imageGenDate.format('DD_MM_YYYY-HHmmss')}`;
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
                    url: `http://assets.lesis.online/${urlPath}`
                });
            } catch (error) {
                this.logger.error(`An error occurred while uploading ${generatedName} to ${process.env.GCP_LF_ASSETS_BUCKET}:`, error);
                res.status(400);
            } finally {
                imageDb.addDocument({
                    l2w_image_conversion_date: imageGenDate.toDate(),
                    l2w_image_conversion_file_name: `${generatedName}.${fileType}`,
                    l2w_image_id: imageID,
                    l2w_image_post_id: requestBodyJSON.postID,
                    l2w_image_url: urlPath
                });
            }
        });

        // fastifyClient.delete()6508ce39086c78b6b29d32d1

        fastifyClient.listen({ port: L2W_SERVER_PORT }, (error) => {
            if (error) {
                this.logger.info('An error occured running the server:', error);
            }

            this.logger.info(`Leaf post server is running. Listening for requests at ${L2W_SERVER_URL}:${L2W_SERVER_PORT}`);
        });
    }

    async liveEditingServer() {
        const socket = new this.client.Server(this.options.port, {
            cors: {
                methods: ['GET', 'POST']
            },
            transports: ['polling']
        });

        socket.on('connection', (socket) => {
            this.logger.info('Successfully connected to the Left-2-Write server');
            this.socket = socket;

            socket.on("send-changes", async (delta) => {
                socket.broadcast.emit('receive-changes', delta);
            });

            socket.on("save-document", async (contents: ILeft2Write) => {
                await this.dbs.updateDocument({ l2w_id: contents.l2w_id }, contents)
                    .then((updatedDocument) => {
                        if (!updatedDocument) {
                            return;
                        }

                        this.logger.info(`Updated document data on database for post:`, updatedDocument.l2w_id);
                    });
            });

            socket.on("receive-document", async (data: ILeft2Write) => {
                let post = (await this.dbs.model.findOne({ l2w_id: data.l2w_id }))?.toJSON();

                if (!post) {
                    post = (await this.dbs.addDocument(data)).toJSON();
                }

                socket.emit("document-data", post);
            });
        });


        return socket;
    }
}