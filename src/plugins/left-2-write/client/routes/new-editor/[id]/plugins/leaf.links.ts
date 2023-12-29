import { EditorState, Plugin, type PluginView } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { findMarkPositions, markActive } from "$lib/editor/menu/leaf.menu_commands";
import LeafLinkPrompt from "$lib/editor/menu/prompt/link/leaf.link_prompt.svelte";
import leafSchema from "../editor/leaf.schema";
import { Fragment, Node, Slice } from "prosemirror-model";
import { L2W_URL_REGEX } from "../../../../../l2w.constants";
import { isBetween } from "../../../../../l2w.util";

export class LinkPromptView implements PluginView {
    view: EditorView;
    floatingMenu: HTMLDivElement;
    component: LeafLinkPrompt;

    constructor(view: EditorView) {
        this.view = view;
        this.createMenuContainer();

        this.render();
        this.update(view, null);
    }

    private createMenuContainer() {
        this.floatingMenu = document.createElement('div');
        this.floatingMenu.className = 'lf-floating-container';

        this.view.dom.parentNode.appendChild(this.floatingMenu);

        return this.floatingMenu;
    }

    currentLink: string = null;

    private destroyPrompt() {
        if (this.component) {
            this.component.$destroy();
            this.component = null;
        }
    }

    update = async (view: EditorView, prevState: EditorState) => {
        const root = this.floatingMenu;
        const state = view.state;
        const selection = state.selection;
        const linkMark = leafSchema.marks.link;
        const { $from, $to } = state.selection;
        const prevSelection = prevState?.selection;
        const prevStateMark = prevSelection?.$to.marks().find((value) => value.type === linkMark);
        const marks = $to.marks()
        const firstMark = marks.find((value) => value.type === linkMark);
        const markRange = findMarkPositions(linkMark, state.doc, $from.pos, $to.pos);

        if (prevState && prevState.doc.eq(state.doc)
            && prevState.selection.eq(selection)) {

            return;
        }

        if (!markActive(state, linkMark) || !view.hasFocus() || !selection.empty) {
            root.style.display = "none";
            this.destroyPrompt();

            return;
        }

        if (firstMark?.attrs.href && firstMark?.attrs.href !== prevStateMark?.attrs.href) {
            this.currentLink = firstMark?.attrs.href;
        }

        // If the previous selection didn't have the same link/link href as the current selection
        // and is in the same range as the current selection, then we can cancel rendering the prompt
        // This prevents the solo link prompt from rendering at the same time as the menu link prompt
        // when creating a new link mark on a valid URL.
        // I hope this makes sense lmao. Basically, remove this if statement and two prompts
        // will render at the same time if you create a new link 
        if (!prevStateMark?.attrs.href &&
            isBetween(markRange.start, prevSelection.from, prevSelection.to) ||
            isBetween(markRange.end, prevSelection.from, prevSelection.to)
        ) {
            return;
        }

        if (root.style.display === "none" || !this.component) {
            this.render();
        }

        root.style.display = "";

        const { from, to } = selection;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        const box = root.offsetParent.getBoundingClientRect();
        const left = Math.max((start.left + end.left) / 2, start.left + 3);

        root.style.left = (left - box.left) - 200 + "px";
        root.style.bottom = (box.bottom - start.top) + 150 + "px";
    };

    destroy = () => {
        this.floatingMenu.remove();
        this.destroyPrompt();
    };

    render = () => {
        this.component = new LeafLinkPrompt({
            target: this.floatingMenu,
            props: {
                embedded: true
            }
        });
    };
}

function linkify(fragment: Fragment) {
    const linkified: Node[] = [];

    fragment.forEach((node) => {
        if (!node.isText) {
            linkified.push(node.copy(linkify(node.content)));
            return;
        }

        const text = node.text as string;
        let match;
        let pos = 0;

        // eslint-disable-next-line no-cond-assign
        while (match = L2W_URL_REGEX.exec(text)) {
            const start = match.index;
            const end = start + match[0].length;
            const link = node.type.schema.marks['link'];

            // simply copy across the text from before the match
            if (start > 0) {
                linkified.push(node.cut(pos, start));
            }

            const urlText = text.slice(start, end);
            linkified.push(
                node.cut(start, end).mark(link.create({ href: urlText }).addToSet(node.marks))
            );
            pos = end;
        }

        // copy over whatever is left
        if (pos < text.length) {
            linkified.push(node.cut(pos));
        }

    });

    return Fragment.fromArray(linkified);
}

const linksPlugin = new Plugin({
    view: (view) => new LinkPromptView(view),
    props: {
        transformPasted(slice) {
            return new Slice(linkify(slice.content), slice.openStart, slice.openEnd);
        },
    }
});

export default linksPlugin;