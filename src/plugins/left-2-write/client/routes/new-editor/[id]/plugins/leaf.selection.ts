import { EditorState, Transaction, NodeSelection } from "prosemirror-state";

export function selectAllTextInParent(state: EditorState, dispatch?: (tr: Transaction) => void) {
    const { selection } = state;
    let newSelection: NodeSelection;

    state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        if (node.type.isText) {
            return;
        }

        if (node.type.isTextblock && node.type.name === "paragraph") {
            return;
        }

        if (!newSelection && node.isBlock && node.type.name !== 'editor_header') {
            newSelection = NodeSelection.create(state.doc, pos);
        }
    });

    if (!newSelection) {
        return false;
    }

    dispatch(state.tr.setSelection(newSelection));

    return true;
}