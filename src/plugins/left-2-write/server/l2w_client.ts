/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as io from 'socket.io';
import PluginInstance from '../../plugin_instance';
import type { FlowStateL2W, ILeft2Write, L2WOptions, PostAction } from '../../../types/plugins/l2w.types';
import { L2W_DB_CONNECTION_DEFAULTS, left2Write } from "../../../config/db.config";
import type { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { fastifyClient } from '../../../config/clients.config';
import { L2W_EDITOR_HREF, L2W_SERVER_PORT, L2W_SERVER_URL } from '../l2w.constants';
import fastifyCors from '@fastify/cors';
import { generateRandomID, sleep } from '../../../util';
import { URL_VALID_CHARACTERS } from '../../../globals';

export class L2WServer extends PluginInstance<FlowStateL2W, ILeft2Write, typeof io> {
    protected options: L2WOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket: io.Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

    constructor(options: L2WOptions) {
        super({
            collectionName: 'bouquet',
            colour: '#DA70D6',
            schema: left2Write,
            client: io
        });

        this.options = options;
    }

    async postServer() {
        fastifyClient.register(fastifyCors);

        const db = this.dbs;
        const dbConnection = await db.createNewConnection(L2W_DB_CONNECTION_DEFAULTS);

        const webflowCollection = (await this.webflowService.getAllCollections()).find(collection => collection.name.toLowerCase().includes('posts'));

        dbConnection.on('open', () => {
            this.logger.info('Opened connection to MongoDB for Leaf posts');
        });

        fastifyClient.get('/posts', async (req, res) => {
            const posts = await db.model.find().then(documents => {
                this.logger.info(`Sending post info to client: ${req.hostname}`);
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
            const post = await db.model.findOne({ l2w_id: postID }).then(document => {
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

            await db.addDocument(requestDataJSON)
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
            const storedPost = await db.model.findOne({ l2w_id: postID });

            try {
                let postItem;

                switch (action) {
                    case 'publish': {
                        await this.webflowService.client.publishItems({
                            collectionId: webflowCollection._id,
                            itemIds: [storedPost.l2w_wf_item_id],
                            live: true
                        });

                        await db.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: 'published'
                        });

                        this.logger.info(`Post ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)} has been published to Webflow`);
                    }

                        break;

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
                            _archived: false,
                            _draft: false
                        });

                        await db.updateDocument({ l2w_id: postID }, {
                            l2w_wf_post_status: !postItem['published-on'] ? 'staged' : 'published',
                            l2w_slug: postItem.slug,
                            l2w_wf_item_id: postItem._id
                        }).then(document => {
                            this.logger.debug(false, `Changed doc`, document);
                            return document;
                        });

                        this.logger.info(`Post ${this.pluginColour(`${postItem.name} (${postItem['post-id']})`)} has been staged to Webflow`);
                    }

                        break;

                    case 'update': {
                        postItem = await this.webflowService.updateItem(webflowCollection._id, postID, {
                            name: storedPost.l2w_title,
                            slug: `${storedPost.l2w_title.toLowerCase()
                                .replaceAll("'", "")
                                .replaceAll(URL_VALID_CHARACTERS, '-')}-${postID}`,
                            "post-id": postID,
                            "post-author": storedPost.l2w_author,
                            "post-last-saved-at": storedPost.l2w_last_saved_at,
                            "post-rich-text": storedPost.l2w_raw_html,
                            "post-plain-text": storedPost.l2w_plain_text,
                            _archived: false,
                            _draft: false
                        });

                        this.logger.info(`Post ${this.pluginColour(`${postItem.name} (${postItem['post-id']})`)} has been updated on Webflow`);
                    }

                        break;

                    case 'unpublish': {
                        // Will be written
                    }

                        break;
                }

                await sleep(3000);
                const actualUpdatedDoc = await db.model.findOne({ l2w_id: postID });

                res.status(201).send(actualUpdatedDoc);

            } catch (error) {
                console.log(error);
                this.logger.error(`Error creating blog post on Webflow for  ${this.pluginColour(`${storedPost.l2w_title} (${storedPost.l2w_id})`)}`, error);
                res.status(500);
            }


        });

        // fastifyClient.delete()

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

        const db = this.dbs;
        const dbConnection = await db.createNewConnection(L2W_DB_CONNECTION_DEFAULTS);

        dbConnection.on('open', () => {
            this.logger.info('Opened connection to MongoDB for Leaf posts');
        });

        socket.on('connection', (socket) => {
            this.logger.info('Successfully connected to the Left-2-Write server');
            this.socket = socket;

            socket.on("send-changes", async (delta) => {
                socket.broadcast.emit('receive-changes', delta);
                // this.logger.debug(false, 'Incoming delta...', delta);
            });

            socket.on("save-document", async (contents: ILeft2Write) => {
                await db.updateDocument({ l2w_id: contents.l2w_id }, contents)
                    .then((updatedDocument) => {
                        if (!updatedDocument) {
                            return;
                        }

                        this.logger.info(`Updated document data on database for post:`, updatedDocument.l2w_id);
                    });
            });

            socket.on("receive-document", async (data: ILeft2Write) => {
                let post = (await db.model.findOne({ l2w_id: data.l2w_id }))?.toJSON();

                if (!post) {
                    post = (await db.addDocument(data)).toJSON();
                }

                socket.emit("document-data", post);
            });
        });


        return socket;
    }
}

const server = new L2WServer({
    port: 7777,
    origin: L2W_EDITOR_HREF
});

server.postServer();

server.liveEditingServer();