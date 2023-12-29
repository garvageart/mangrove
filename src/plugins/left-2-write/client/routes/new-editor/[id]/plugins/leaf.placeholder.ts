import type { Node } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export default new Plugin({
    props: {
        decorations: state => {
            const decorations: Decoration[] = [];
            const bannedNodes = ['paragraph', 'code_block', 'image'];

            const decorate = (node: Node, pos: number) => {
                if (bannedNodes.includes(node.type.name)) {
                    return;
                }

                const placeHolder = document.createElement('span');
                placeHolder.classList.add('placeholder');
                let widget: Decoration;

                if (node.type.isBlock && node.childCount === 0) {
                    widget = Decoration.widget(pos + 1, placeHolder);
                }

                if (node.type.name === 'editor_body' && !node.textContent) {
                    widget = Decoration.widget(pos + 2, placeHolder);
                }

                if (!widget) {
                    return;
                }

                decorations.push(widget);
            };

            state.doc.descendants(decorate);

            return DecorationSet.create(state.doc, decorations);
        },
    }
});