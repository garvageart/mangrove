/* eslint-disable @typescript-eslint/no-explicit-any */
import { setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import type { MarkType, Schema } from "prosemirror-model";
import { wrapInList } from "prosemirror-schema-list";
import type { Command, EditorState, Transaction } from "prosemirror-state";

export const areMarksEqualForSelection = (state: EditorState, type: MarkType) => {
    const { from, to, empty } = state.selection;
    const mark = type.isInSet(
        state.storedMarks || state.doc.resolve(from + 1).marks()
    );
    if (empty || !mark) {
        return mark;
    }
    for (let i = from + 2; i < to; i++) {
        const currentMark = type.isInSet(state.doc.resolve(i).marks());
        if (!currentMark || !currentMark.eq(mark)) {
            return false;
        }
    }
    return mark;
};

export const customCommand = (callback: (state: EditorState, dispatch: (tr: Transaction) => void) => boolean) => (
    state: EditorState,
    dispatch?: (tr: Transaction) => void) => {
    return callback(state, dispatch);
};

export class EditorCommands {
    schema: Schema;
    constructor(schema: Schema) {
        this.schema = schema;
    }

    // Commands for marks
    toggleBold = () => toggleMark(this.schema.marks.strong);
    toggleItalics = () => toggleMark(this.schema.marks.em);
    toggleCode = () => toggleMark(this.schema.marks.code);
    toggleUnderline = () => toggleMark(this.schema.marks.underline);
    toggleStrikethrough = () => toggleMark(this.schema.marks.strikethrough);

    // Block commands
    createCodeBlock = () => setBlockType(this.schema.nodes.code_block);
    createOrderedList = () => wrapInList(this.schema.nodes.ordered_list);
    createBulletList = () => wrapInList(this.schema.nodes.bullet_list);
    // customCommandsKeymap["Mod-Shift-["] = () => liftListItem(this.schema.nodes.list_item);
    // customCommandsKeymap["Mod-Shift-]"] = () => sinkListItem(this.schema.nodes.list_item);
    // customCommandsKeymap["Enter"] = () => splitListItem(this.schema.nodes.list_item);
    createBlockquote = () => wrapIn(this.schema.nodes.blockquote);
    createHorizontalLine: Command = (state, dispatch) => {
        if (dispatch) dispatch(state.tr.replaceSelectionWith(this.schema.nodes.horizontal_rule.create()).scrollIntoView());
        return true;
    };

    // Utility commands
    increaseHeadingSize: Command = (state, dispatch) => {
        const { selection } = state;
        const node = selection.$from.node();

        if (node.type.name !== "heading") return false;

        let level = node.attrs.level;
        if (level >= 6) {
            level = 1;
        } else level += 1;

        dispatch(
            state.tr.setNodeMarkup(selection.$from.before(), null, {
                ...node.attrs,
                level
            })
        );
        return true;
    };

    private changeIndent = (type: 'increase' | 'decrease'): Command => (state, dispatch) => {
        const allowedIndentBlocks = ['paragraph', 'heading'];
        const { selection } = state;
        const node = selection.$from.node();

        if (!allowedIndentBlocks.includes(node.type.name)) {
            return false;
        }

        let indent = node.attrs.indent;

        switch (type) {
            case 'increase':
                if (indent === 24) {
                    return false;
                }

                indent += 3;
                break;
            case 'decrease':
                if (indent === 0) {
                    return false;
                }

                indent -= 3;
                break;
        }

        dispatch(
            state.tr.setNodeMarkup(selection.$from.before(), null, {
                ...node.attrs,
                indent
            })
        );

        return true;
    };

    increaseIndent = this.changeIndent('increase');
    decreaseIndent = this.changeIndent('decrease');
}