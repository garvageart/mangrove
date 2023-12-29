import hljs from "highlight.js";
import { getHighlightDecorations } from "prosemirror-highlightjs";
import { Plugin } from "prosemirror-state";
import leafSchema from "../editor/leaf.schema";
import { DecorationSet } from "prosemirror-view";

const syntaxHighlighterPlugin = new Plugin({
    state: {
        init(_config, instance) {
            const content = getHighlightDecorations(
                instance.doc,
                hljs,
                [
                    leafSchema.nodes.code_block.name,
                ],
                () => {
                    return '';
                }
            );
            return DecorationSet.create(instance.doc, content);
        },
        apply(tr, set) {
            if (tr.docChanged || tr.selection.$from.parent.type.name !== 'code_block') {
                return set.map(tr.mapping, tr.doc);
            }

            const content = getHighlightDecorations(
                tr.doc,
                hljs,
                [
                    leafSchema.nodes.code_block.name
                ],
                () => {
                    return '';
                }
            );
            return DecorationSet.create(tr.doc, content);
        },
    },
    props: {
        decorations(state) {
            return this.getState(state);
        },
    },
});

export default syntaxHighlighterPlugin;