import mongoose, { Types } from "mongoose";
import chalk from "chalk";
import type { Collection, IItemDelete, Item, Site } from "webflow-api/dist/api";
import { webflowClient } from "../config/clients.config";
import Logger from "../logger";
import type { IFlowStateCollections, IFlowStateSites, WebflowServiceOptions } from "../types/webflow.service";
import { DatabaseService } from "./db.service";
import { FlowStateCollections, FlowStateSites, WEBFLOW_DB_CONNECTION_DEFAULTS } from "../config/db.config";
import { checkObjectEquality, generateRandomID } from "../util";

export class WebflowService<WebflowCollectionFields>  {
    collectionName: string | undefined;
    collectionID: string | undefined;
    siteID: string;
    logger = new Logger('Webflow Service', "service");
    colour = chalk.hex('#3545EE');
    dbSites = new DatabaseService<IFlowStateSites>({
        collectionName: 'webflow-sites',
        schema: FlowStateSites
    });

    dbCollections = new DatabaseService<IFlowStateCollections>({
        collectionName: 'webflow-collections',
        schema: FlowStateCollections
    });

    client = webflowClient;
    constructor(options?: WebflowServiceOptions) {
        this.collectionName = options?.collectionName;
        this.collectionID = options?.collectionID;
        this.siteID = options?.siteID;
    }

    async getSite() {
        const site: Site = await this.client.site({ siteId: this.siteID })
            .catch((error) => {
                this.logger.error('There was an error retrieving site data from Webflow', error);
                return error;
            });

        return site;
    }

    async getSites() {
        const sites: Site[] = await this.client.sites()
            .catch((error) => {
                this.logger.error('There was an error retrieving sites from Webflow', error);
                return error;
            });

        return sites;
    }

    async getAllCollections(siteID?: string) {
        const collections: Collection[] = await this.client.collections({ siteId: siteID || this.siteID })
            .catch((error) => {
                this.logger.error('There was an error retriving all collection data from Webflow', error);
                return error;
            });

        return collections;
    }

    async getCollection(collectionID?: string) {
        const collection: Collection = await this.client.collection({ collectionId: this.collectionID || collectionID })
            .catch(error => {
                this.logger.error('There was an error retriving collection data from Webflow', error);
                return error;
            });

        return collection;
    }

    async getCollectionItems(collectionID?: string) {
        const collection: Collection = await this.getCollection(collectionID);
        const items = await collection.items();

        return items as WebflowCollectionFields[] & Item[];
    }

    async addItem(collectionID: string, fields: WebflowCollectionFields extends object ? WebflowCollectionFields : object) {
        const collection = await this.client.collection({ collectionId: collectionID });
        const item = await collection.createItem(fields);

        return item as WebflowCollectionFields & Item;
    }

    async removeItem(collectionID: string, itemID: string) {
        const collection = await this.client.collection({ collectionId: collectionID });
        const deletedItem = await collection.removeItem({ itemId: itemID });

        return deletedItem;
    }

    async updateItem(collectionID: string, itemID: string, fields: WebflowCollectionFields extends object ? object : never) {
        const collection = await this.client.collection({ collectionId: collectionID });

        const updatedItem = await collection.updateItem({
            itemId: itemID,
            fields: fields
        });

        return updatedItem as Item & WebflowCollectionFields;
    }

    async removeMultipleItems(collectionID: string, itemIDs: string[]) {
        const collection = await this.client.collection({ collectionId: collectionID });
        const deletedItems: IItemDelete[] = [];

        for await (const itemID of itemIDs) {
            const deletedItem = await collection.removeItem({ itemId: itemID });

            deletedItems.push(deletedItem);
        }

        return deletedItems;
    }

    async storeSites() {
        const webflowSitesMongo = this.dbSites;
        const webflowCollectionsMongo = this.dbCollections;

        await webflowCollectionsMongo.createNewConnection(WEBFLOW_DB_CONNECTION_DEFAULTS);
        await webflowSitesMongo.createNewConnection(WEBFLOW_DB_CONNECTION_DEFAULTS);

        this.logger.info('Checking for Webflow Sites that need to be stored locally...');

        const wfSites = await this.getSites();
        const dbWebflowSites = await webflowSitesMongo.model.find();
        const dbWebflowSiteIDs = dbWebflowSites.map(sites => sites.wf_site_id);

        for await (const site of wfSites) {
            const sitePrimaryDomain = (await site.domains()).find(domain => !domain.name.includes('www'));

            if (dbWebflowSiteIDs.includes(site._id)) {
                this.logger.info(`Webflow Site ${this.colour(`https://${sitePrimaryDomain.name} | ${site._id}`)} already exists in the local database`);
                continue;
            }

            const wfSiteCollections = await webflowCollectionsMongo.model.find();

            await webflowSitesMongo.addDocument({
                _id: new Types.ObjectId(),
                wf_site_id: site._id,
                wf_site_database_id: site.database,
                wf_site_local_site_id: generateRandomID({ numLength: 6, idLength: 24 }),
                wf_site_name: site.name,
                wf_site_last_published_date: new Date(site.lastPublished),
                wf_site_site_preview: site.previewUrl,
                wf_site_site_collections: wfSiteCollections.map(document => document._id)
            }).then(document => this.logger.info(`Webflow Site ${this.colour(document.wf_site_name)} (${`https://${sitePrimaryDomain.name}`}) has been added to the local database`))
                .catch(error => this.logger.error('An error occured adding the Webflow Site to database:', error));
        }

        if (mongoose.connection.readyState === (99 || 0)) {
            await webflowSitesMongo.closeConnection().then(() =>
                this.logger.info(`MongoDB connection for ${this.colour(webflowSitesMongo.collectionName)} is closed`));

            await webflowCollectionsMongo.closeConnection().then(() =>
                this.logger.info(`MongoDB connection for ${this.colour(webflowCollectionsMongo.collectionName)} is closed`));
        }
    }

    async storeCollections() {
        const webflowMongo = this.dbCollections;

        await webflowMongo.createNewConnection(WEBFLOW_DB_CONNECTION_DEFAULTS);

        const webflowCollections = await this.getAllCollections();
        const dbWebflowCollections = await webflowMongo.model.find();
        const dbWebflowCollectionIDs = dbWebflowCollections.map(collection => collection.wf_collection_id);

        const siteDatabaseID = (await this.getSite()).database;

        this.logger.info('Checking for Webflow Collections that need to be stored locally...');

        for await (const collection of webflowCollections) {
            if (dbWebflowCollectionIDs.includes(collection._id)) {
                this.logger.info(`Webflow Collection ${this.colour(collection.name)} (${collection._id}) already exists in the local database`);
                continue;
            }

            const fetchCollectionItems = async () => {
                this.logger.info(`Fetching all items from Webflow Collection ${this.colour(collection.name)} (${collection._id})`);
                return await collection.items();
            };

            const collectionItems = await fetchCollectionItems();

            this.logger.info(`Adding Webflow Collection ${this.colour(collection.name)} (${collection._id}) to local database...`);

            await webflowMongo.addDocument({
                _id: new Types.ObjectId(),
                wf_collection_database_id: siteDatabaseID,
                wf_collection_site_id: this.siteID,
                wf_collection_id: collection._id,
                wf_collection_name: collection.name,
                wf_collection_items: collectionItems,
                wf_collection_item_count: collectionItems.length,
                wf_collection_last_updated: new Date(collection.lastUpdated),
                wf_collection_created_on: new Date(collection.createdOn),
                wf_collection_local_collection_name: collection.slug,
                wf_collection_local_id: generateRandomID({ numLength: 6, idLength: 24 })
            }).then(document => this.logger.info(`Webflow Collection ${this.colour(document.wf_collection_name)} has been added to the local database`))
                .catch(error => this.logger.error('An error occured adding the Webflow Collection to database:', error));
        }

        await webflowMongo.closeConnection().then(() =>
            this.logger.info(`MongoDB connection for ${this.colour(webflowMongo.collectionName)} is closed`));
    }

    async syncCollections() {
        const webflowMongo = this.dbCollections;

        await webflowMongo.createNewConnection(WEBFLOW_DB_CONNECTION_DEFAULTS);

        this.logger.info('Checking for data equality using locally stored Item array and Webflow API Item array');

        const wfCollections = await this.getAllCollections();
        const dbWebflowCollections = await webflowMongo.model.find();

        for await (const collection of wfCollections) {
            const apiCollectionItems = await collection.items();

            if (!apiCollectionItems.length) {
                this.logger.info(`${this.colour(collection.name)} has no items in the Webflow Collection to check. Moving on...`);
                continue;
            }

            const dbWebflowCollection = dbWebflowCollections.find(document => document.wf_collection_id === collection._id);
            const dbWebflowCollectionObject = dbWebflowCollection.toObject();

            const sortedDbCollectionItems = dbWebflowCollectionObject.wf_collection_items.sort((a, b) => new Date(a["created-on"]).getMilliseconds() - new Date(b["created-on"]).getMilliseconds());
            const sortedApiCollectionItems = apiCollectionItems.sort((a, b) => new Date(a["created-on"]).getMilliseconds() - new Date(b["created-on"]).getMilliseconds());

            const areCollectionItemsTheSame = checkObjectEquality(sortedDbCollectionItems, sortedApiCollectionItems);

            // Loop through the locally stored items and update the items in the array 
            // which have differing data. That array data will then be rewritten back into the database
            for (let i = 0; i < sortedDbCollectionItems.length; i++) {
                let localWFItem = sortedDbCollectionItems[i];
                const apiItem = sortedApiCollectionItems[i];

                const areItemsTheSame = checkObjectEquality(localWFItem, apiItem);

                if (!areItemsTheSame) {
                    this.logger.info(`Webflow Data for ${this.colour(localWFItem._id)} on ${this.colour(collection.name)} has changed. Replacing the local data`);

                    localWFItem = apiItem;
                } else {
                    this.logger.info(`No data has changed for ${this.colour(localWFItem._id)} on ${this.colour(collection.name)}. Moving onto the next item...`);
                }
            }

            if (!areCollectionItemsTheSame) {
                this.logger.info(`All differing data has been updated for ${this.colour(collection.name)}. Writing it back into the database`);
                dbWebflowCollection.updateOne({ wf_collection_items: sortedDbCollectionItems });
            } else {
                this.logger.info(`No data has changed for ${this.colour(collection.name)}. Moving onto the next Webflow Collection...`);
            }

            await webflowMongo.updateDocument({ wf_collection_id: collection._id }, {
                wf_collection_site_id: this.siteID,
                wf_collection_id: collection._id,
                wf_collection_name: collection.name,
                wf_collection_item_count: sortedApiCollectionItems.length,
                wf_collection_last_updated: new Date(collection.lastUpdated),
                wf_collection_created_on: new Date(collection.createdOn),
                wf_collection_local_collection_name: collection.slug
            }).then(document => this.logger.info(`Webflow Collection ${this.colour(document.wf_collection_name)} has been updated on the local database`))
                .catch(error => this.logger.error('An error occured updating the Webflow Collection on the local database:', error));
        }

        const wfCollectionIDs = wfCollections.map(collection => collection._id);
        const dbWebflowCollectionIDs = dbWebflowCollections.map(collection => collection.wf_collection_id);

        for await (const collectionID of dbWebflowCollectionIDs) {
            if (!wfCollectionIDs.includes(collectionID)) {
                this.logger.info(`Webflow Collection ${this.colour(collectionID)} does not exist on Webflow anymore. Deleting from the local database...`);

                await webflowMongo.deleteDocument({ wf_collection_id: collectionID })
                    .then(document => this.logger.info(`Webflow Collection ${this.colour(document.wf_collection_name)} has been deleted from the local database`))
                    .catch(error => this.logger.error(`An error occured deleting the Webflow Collection ${this.colour(collectionID)} on the local database:`, error));
            }
        }

        if (mongoose.connection.readyState === (99 || 0)) {
            await webflowMongo.closeConnection().then(() =>
                this.logger.info(`MongoDB connection for ${this.colour(webflowMongo.collectionName)} is closed`));
        }
    }

    async syncSite() {
        const webflowSitesMongo = this.dbSites;
        const webflowCollectionsMongo = this.dbCollections;

        await webflowCollectionsMongo.createNewConnection(WEBFLOW_DB_CONNECTION_DEFAULTS);
        await webflowSitesMongo.createNewConnection(WEBFLOW_DB_CONNECTION_DEFAULTS);

        const wfSite = await this.getSite();
        const wfSiteCollections = await webflowCollectionsMongo.model.find();

        const sitePrimaryDomain = (await wfSite.domains()).find(domain => !domain.name.includes('www'));

        await webflowSitesMongo.updateDocument({ wf_site_id: wfSite._id }, {
            wf_site_id: wfSite._id,
            wf_site_database_id: wfSite.database,
            wf_site_name: wfSite.name,
            wf_site_last_published_date: new Date(wfSite.lastPublished),
            wf_site_site_collections: wfSiteCollections.map(document => document._id)
        }).then(document => this.logger.info(`Webflow Site ${this.colour(`https://${sitePrimaryDomain.name} | ${document.wf_site_id}`)} has been updated on the local database`))
            .catch(error => this.logger.error('An error occured updating the Webflow Site on the local database:', error));


        if (mongoose.connection.readyState === (99 || 0)) {
            await webflowSitesMongo.closeConnection().then(() =>
                this.logger.info(`MongoDB connection for ${this.colour(webflowSitesMongo.collectionName)} is closed`));

            await webflowCollectionsMongo.closeConnection().then(() =>
                this.logger.info(`MongoDB connection for ${this.colour(webflowCollectionsMongo.collectionName)} is closed`));
        }
    }
}