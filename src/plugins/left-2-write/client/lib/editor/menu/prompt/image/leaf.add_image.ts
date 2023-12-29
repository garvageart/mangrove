import { page } from "$app/stores";
import { editorContents as editorContentsStore, editorView } from "$lib/stores/editor";
import { addToast } from "$lib/ui/notification_toast.store";
import { saveDocument } from "left-2-write/routes/new-editor/[id]/leaf.utils";
import { L2W_SERVER_HREF } from "../../../../../../l2w.constants";
import type { EditorView } from "prosemirror-view";
import type { Attrs, Node as PMNode } from "prosemirror-model";
import leafSchema from "left-2-write/routes/new-editor/[id]/editor/leaf.schema";
import type { ImageUploadFileData, ImageUploadSuccess } from "../../../../../../../../types/plugins/l2w.editor.types";
import { get } from "svelte/store";

export default class LeafImageController {
    allowedTypes: string[];
    fileHolder: HTMLInputElement;
    editor: EditorView;
    node: PMNode;
    imageData: ImageUploadSuccess;

    constructor(allowedTypes: string[]) {
        this.allowedTypes = allowedTypes;
        this.fileHolder = document.createElement("input");
        this.editor = get(editorView);

        this.createFileHolder();
    }

    async readFile(fileList: FileList) {
        const file = fileList.item(0);

        const rawData = await new Promise<string | ArrayBuffer>((resolve) => {
            const reader = new FileReader();

            reader.onloadend = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });

        return { file, rawData };
    }

    insertTempImage(attrs: Attrs) {
        const imageNode = leafSchema.nodes.image.create({ src: attrs.src });
        this.node = imageNode;

        this.editor.dispatch(this.editor.state.tr.replaceSelectionWith(imageNode)
            .replaceWith(
                this.editor.state.selection.$head.pos,
                this.editor.state.selection.$head.pos,
                this.editor.state.schema.nodes.paragraph.create()
            ).scrollIntoView());

        return imageNode;
    }

    async removeTempImage() {
        const imageData = this.imageData;

        const currentPosition = this.editor.state.selection.$head.pos;
        const updatedState = this.editor.state.tr.setNodeMarkup(currentPosition, null, { src: imageData.url, ...this.node.attrs });

        this.editor.dispatch(updatedState);
    }

    private createFileHolder() {
        const allowedMimeTypesString = this.allowedTypes.map((mimeType) => "image/" + mimeType).join(", ");

        const fileHolder = this.fileHolder;
        fileHolder.setAttribute("type", "file");
        fileHolder.setAttribute("accept", allowedMimeTypesString);
    }

    async uploadImage() {
        const result = new Promise<ImageUploadSuccess>((resolve, reject) => {
            this.fileHolder.click();

            this.fileHolder.addEventListener("change", async () => {
                const fileData = await this.readFile(this.fileHolder.files);
                this.fileHolder.remove();

                const postID = get(page).data.l2w_id;
                const editorContents = get(editorContentsStore);

                const fileInformation: ImageUploadFileData = {
                    metadata: {
                        postID: postID,
                        name: fileData.file.name,
                        size: fileData.file.size,
                        directory: fileData.file.webkitRelativePath
                    },
                    data: fileData.rawData as string
                };

                
                try {
                    const imageNode = this.insertTempImage({
                        src: fileData.rawData,
                        style: "max-width: 98% !important; filter: blur(5px); opacity: 0.3; display: inline-block;"
                    });
                    
                    const responseData = await fetch(`${L2W_SERVER_HREF}/images`, {
                        body: JSON.stringify(fileInformation),
                        method: "POST"
                    });

                    setTimeout(async () => {
                        saveDocument(editorContents);
                        const imageData = await responseData.json() as ImageUploadSuccess;
                        this.imageData = imageData;
                        const { state } = this.editor;
                        const { selection } = state;

                        this.editor.dispatch(state.tr.setNodeMarkup(selection.$from.pos - 1, null, { ...imageNode.attrs, src: imageData.url, "img-id": imageData.id, style: "display: block;" }));

                        resolve(this.imageData);
                        addToast({ message: "Image uploaded successfully", timeout: 3000 });
                    }, 3500);
                } catch (error) {
                    const caughtError = error as Error;

                    reject("Upload failed: " + caughtError.message);
                    addToast({ message: caughtError.message as string, timeout: 3000 });
                }
            });
        });

        return Promise.resolve(result);
    }
}