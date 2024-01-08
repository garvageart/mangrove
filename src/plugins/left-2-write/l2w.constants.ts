import { IS_ENV } from "../../globals";

export const L2W_EDITING_SERVER_PORT = 7777;
export const L2W_EDITING_SERVER_URL = 'http://leaf-live-editor.lesis.online';
export const L2W_EDITING_SERVER_HREF = `${L2W_EDITING_SERVER_URL}:${L2W_EDITING_SERVER_PORT}`;

export const L2W_SERVER_PORT = 3333;
export const L2W_SERVER_URL = 'http://leaf.lesis.online';
export const L2W_SERVER_HREF = (IS_ENV.production || process) && (!globalThis.window) ? `https://127.0.0.1:${L2W_SERVER_PORT}` : `${L2W_SERVER_URL}:${L2W_SERVER_PORT}`;

export const L2W_EDITOR_PORT = 5555;
export const L2W_EDITOR_URL = 'http://leaf-editor.lesis.online';
export const L2W_EDITOR_HREF = `${L2W_EDITOR_URL}:${L2W_EDITOR_PORT}`;

export const L2W_ALLOWED_IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
export const L2W_URL_REGEX = new RegExp('^(https?:\\/\\/)?' + // validate protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
    '(\\#[-a-z\\d_]*)?$', 'ig'); // validate fragment locator