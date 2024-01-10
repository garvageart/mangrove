import { IS_ENV } from "../../../globals";
import { L2W_EDITOR_URL, L2W_EDITOR_HREF } from "../l2w.constants";
import { L2WServer } from "./l2w_client";

const left2Write = new L2WServer({ port: 7777 });

left2Write.runL2WServer();
left2Write.logger.info(`Open Leaf editor at ${left2Write.pluginColour(IS_ENV.production ? L2W_EDITOR_URL : L2W_EDITOR_HREF)}`);
