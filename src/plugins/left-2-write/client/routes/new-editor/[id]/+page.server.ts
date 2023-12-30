import type { ILeft2Write } from "../../../../../../types/plugins/l2w.types";
import { L2W_SERVER_HREF } from "../../../../l2w.constants";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (loadEvent) => {
    const postID = loadEvent.params.id;
    const postData = await (await loadEvent.fetch(`${L2W_SERVER_HREF}/posts/${postID}`)).json() as unknown as ILeft2Write;

    return { postData, queries: Object.fromEntries(loadEvent.url.searchParams) };
};