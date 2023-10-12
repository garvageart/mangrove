import type { ILeft2Write } from "../../../../types/plugins/l2w.types";
import { L2W_SERVER_PORT, L2W_SERVER_URL } from "../../l2w.constants";
import type { PageServerLoad } from "./editor/[id]/$types";

export const load: PageServerLoad = async () => {
    const postData = await fetch(`${L2W_SERVER_URL}:${L2W_SERVER_PORT}/posts`, {
        method: 'GET'
    });

    return await postData.json() as {
        posts: ILeft2Write[];
    };
};