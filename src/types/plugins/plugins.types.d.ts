import { ChalkInstance } from "chalk";
import { Schema } from "mongoose";

interface PluginAddOn<AddOn> {
    name: string;
    addOn: AddOn;
}

export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
export type AddonType = ArrayElement<string>;

export interface PluginDefinitionOptions<PluginInterface, ClientInterface> {
    colour: string;
    collectionName: string;
    collectionID?: string;
    schema: Schema<PluginInterface>;
    chalkColour?: ChalkInstance;
    client?: ClientInterface;
    /**
     * @todo Find a way to infer types from addons that are added into the array.
     * For now we are guessing the type based on manually reading the type/inferface.
     * The code will still run as it's still valid JavaScript, but takes up time to correctly guess each addon type correctly.
     * 
     * Similar example of this idea can be found here: https://stackoverflow.com/questions/51879601/how-do-you-define-an-array-of-generics-in-typescript
 
     * The best way right now to clear the issue is to declare a variable with the addon
     * and use type assertions with the same arguments as the variable
  
     * @example
     * ````ts
     * // In the addOns array by constructor, declare your addon like so:
     * import sharp from 'sharp';
     * 
     * class YourPlugin extends PluginInstance<YourPluginInterface, typeof sharp> {
     * constructor() {
     *     super({
     *         colour: "#FFFFFF",
     *         schema: YourPluginSchema,
     *         collectionName: "your-plugin-collection",
     *         client: sharp,
     *         addOns: [
     *             new Cryptographer({
     *                 algorithm: 'aes-256-ccm',
     *                 authTagLength: 16,
     *                 keyStorage: {
     *                     path: "./.example.keys"
     *                 }
     *             })
     *         ]
     *     });
     * }}
     * 
     * // Then before using the addon, declare a variable with the addon:
     * const addon = this.addOns[0] as Cryptographer
     * ````
     * */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addOns?: any[];
}