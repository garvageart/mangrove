import { toggleMark } from "prosemirror-commands";
import { MarkType, Node, NodeType } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { get, writable, type Writable } from "svelte/store";
import { editorState } from "left-2-write/lib/stores/editor";
// import { isInNode, toggleBulletListCommand } from "./utils/listsHelpers";
// import { linkItemCommand, unlinkItemCommand } from "./utils/command-helpers";

export function canInsert(state: EditorState, nodeType: NodeType) {
    const $from = state.selection.$from;

    for (let d = $from.depth; d >= 0; d--) {
        const index = $from.index(d);
        if ($from.node(d).canReplaceWith(index, index, nodeType)) {
            return true;
        }
    }

    return false;
}

export function canMark(state: EditorState, markType: MarkType) {
    const { $from } = state.selection;

    for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type.allowsMarkType(markType)) {
            return true;
        }
    }

    return false;
}

export function markActive(state: EditorState, mark: MarkType) {
    const { from, $from, to, empty } = state.selection;

    if (empty) {
        return !!mark.isInSet(state.storedMarks || $from.marks());
    }

    return state.doc.rangeHasMark(from, to, mark);
}

export function isNode(state: EditorState, node: NodeType) {
    const { $from } = state.selection;

    for (let d = $from.depth; d >= 0; d--) {
        if ($from.node(d).type === node) {
            return true;
        }
    }

    return false;
}

export function runCommand(markOrNode: MarkType | NodeType, command?: Command) {

    const state = get(editorState);
    const isCurrent: Writable<boolean> = writable(null);

    if (markOrNode instanceof MarkType) {
        command = toggleMark(markOrNode);
        isCurrent.set(markActive(state, markOrNode));
    } else {
        isCurrent.set(isNode(state, markOrNode));
    }

    return {
        isCurrent,
        command
    };
}

/**
 * From here on the ProseMirror forums: https://discuss.prosemirror.net/t/getting-the-to-from-positions-for-a-given-mark/3188/2
 */
export function findMarkPositions(mark: MarkType, doc: Node, from: number, to: number) {
    let markPos = { start: -1, end: -1 };

    doc.nodesBetween(from, to, (node, pos) => {
        // stop recursing if result is found
        if (markPos.start > -1) {
            return false;
        }

        if (markPos.start === -1 && mark.isInSet(node.marks)) {
            markPos = {
                start: pos,
                end: pos + Math.max(node.textContent.length, 1),
            };
        }
    });

    return markPos;
}