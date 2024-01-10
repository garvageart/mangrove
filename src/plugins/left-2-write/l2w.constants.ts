export const L2W_SERVER_PORT = 3333;
export const L2W_SERVER_URL = 'http://leaf.lesis.online';
export const L2W_SERVER_HREF = `${L2W_SERVER_URL}:${L2W_SERVER_PORT}`;

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