import { Plugin } from "prosemirror-state";

export default new Plugin({
    props: {
        handlePaste(view, event, slice) {
            console.log("i am in putting this string", slice);
        }
    }
});