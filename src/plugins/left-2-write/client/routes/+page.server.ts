import { dev } from "$app/environment";
import { PUBLIC_WEBSITE_STAGING_DOMAIN_NAME } from "$env/static/public";
import type { ILeft2Write } from "../../../../types/plugins/l2w.types";
import { L2W_SERVER_HREF } from "../../l2w.constants";
import type { PageServerLoad } from "./editor/[id]/$types";

export const load: PageServerLoad = async () => {
    const postData = await fetch(`${L2W_SERVER_HREF}/posts`, {
        method: 'GET'
    });

    const loadData = await postData.json() as {
        posts: ILeft2Write[];
        count: number;
        stagingDomain?: string;
    };
    
    if (dev) {
        loadData.stagingDomain = PUBLIC_WEBSITE_STAGING_DOMAIN_NAME
    }
    
    return loadData;
};