import { joinDown, joinUp, lift, selectParentNode, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { Fragment, type Schema } from "prosemirror-model";
import { liftListItem, sinkListItem, splitListItem, wrapInList } from "prosemirror-schema-list";
import { TextSelection, type Command } from "prosemirror-state";
import { get } from "svelte/store";
import type { KeymapBindings } from "../../../../../../../types/plugins/l2w.editor.types";
import { menuComponentStore, menuViewStore } from "../plugins/leaf.menu";
import { customCommand } from "./leaf.command_helpers";

const delete4Spaces: Command = (state, dispatch) => {
    const { $head, $anchor } = state.selection;
    if (!$head.parent.type.spec.code || !dispatch) {
        return false;
    }

    if (dispatch)
        dispatch(state.tr.delete($head.pos - 4, $anchor.pos).scrollIntoView());

    return true;
};

export const createExplicitNewParagraph: Command = (state, dispatch) => {
    const { $from, $to } = state.selection;
    const schema = state.schema;

    if (!$from.parent.isBlock) {
        return false;
    }

    if ($from.parent.type != schema.nodes.paragraph) {
        return false;
    }

    if (dispatch) {
        const paragraph = schema.nodes.paragraph.createAndFill();
        const insertFirstParagraph = state.tr.insert($to.pos, paragraph);
        const insertSecondParagraph = insertFirstParagraph.insert($to.pos, paragraph);

        const endPos = $to.after() + 3;
        const selection = TextSelection.create(insertSecondParagraph.doc, endPos);

        dispatch(insertSecondParagraph.setSelection(selection).scrollIntoView());
    }

    return true;
};

export const createHardBreak: Command = (state, dispatch) => {
    const { $from, $to } = state.selection;
    const br = state.schema.nodes.hard_break;

    if (!$from.parent.isBlock) {
        return false;
    }

    if ($from.parent.type != state.schema.nodes.paragraph) {
        return false;
    }

    if (!$from.nodeAfter && !$from.nodeBefore) {
        return false;
    }

    // if (!$from.nodeAfter && $from.nodeBefore.type === br) {
    //     return false;
    // }

    if (dispatch) {
        const fragment = Fragment.from([br.create()]);
        const tr = state.tr.replaceWith($from.pos, $to.pos, fragment);
        // const endPos = state.selection.$to.after() - 1;
        // const selection = new TextSelection(tr.doc.resolve(endPos));

        dispatch(tr.scrollIntoView());
    }

    return true;
};

export const createParagraphBelow: Command = (state, dispatch) => {
    const { $from, $to } = state.selection;
    const schema = state.schema;

    if (!$from.parent.isBlock) {
        return false;
    }

    if ($from.parent.type != schema.nodes.paragraph) {
        return false;
    }

    if (dispatch) {
        const paragraph = schema.nodes.paragraph.create();
        const keepCursorTransaction = state.tr.replaceWith($to.pos + 1, $to.pos + 1, paragraph);
        dispatch(keepCursorTransaction.scrollIntoView());
    }

    return true;
};

export const insertHardBreak: Command = (state, dispatch) => {
    const { $from, $to } = state.selection;

    if (dispatch) {
        const br = state.schema.nodes.hard_break;
        dispatch(state.tr.replaceWith($from.pos, $to.pos, br.create()).scrollIntoView());
    }

    return true;
};

export const buildHeadingKeymap = (schema: Schema) => {
    const headingKeymap: KeymapBindings = {};

    for (let i = 2; i <= 6; i++) {
        headingKeymap[`Shift-Ctrl-${i}`] = setBlockType(schema.nodes.heading, { level: i });
    }

    return headingKeymap;
};

export const renderMenuKeymap = () => {
    const menuKeymap = {} as { [keyBinding: string]: Command; };
    menuKeymap["Mod-/"] = () => {
        const menu = get(menuComponentStore);
        const menuView = get(menuViewStore);

        if (!menu) {
            menuView.render();
        } else {
            menuView.componentDestroy();
        }

        return false;
    };

    return menuKeymap;
};

export const buildMarksKeymap = (schema: Schema) => {
    const marksKeymap: KeymapBindings = {};

    marksKeymap["Mod-`"] = toggleMark(schema.marks.code);
    marksKeymap["Mod-b"] = toggleMark(schema.marks.strong);
    marksKeymap["Mod-i"] = toggleMark(schema.marks.em);
    marksKeymap["Mod-u"] = toggleMark(schema.marks.underline);
    marksKeymap["Mod-Shift-X"] = toggleMark(schema.marks.strikethrough);

    return marksKeymap;
};

export const buildCustomCommands = (schema: Schema) => {
    const customCommandsKeymap = {} as { [keyBinding: string]: Command; };

    customCommandsKeymap["Mod-Shift-+"] = customCommand((state, dispatch) => {
        const { selection } = state;
        const node = selection.$from.node();

        if (node.type.name !== "heading") {
            return false;
        }

        let level = node.attrs.level;
        if (level >= 6) {
            level = 2;
        } else level += 1;

        dispatch(
            state.tr.setNodeMarkup(selection.$from.before(), null, {
                ...node.attrs,
                level
            })
        );
        return true;
    });

    customCommandsKeymap["Alt-ArrowUp"] = joinUp;
    customCommandsKeymap["Alt-ArrowDown"] = joinDown;
    customCommandsKeymap["Mod-BracketLeft"] = lift;
    customCommandsKeymap["Escape"] = selectParentNode;
    customCommandsKeymap["Tab"] = (state, dispatch) => {
        const { $head } = state.selection;
        if (!$head.parent.type.spec.code || !dispatch) {
            return false;
        }

        dispatch(state.tr.insertText("    ").scrollIntoView());
        return true;
    };
    customCommandsKeymap["Shift-Tab"] = delete4Spaces;
    customCommandsKeymap["Mod-Backspace"] = delete4Spaces;
    customCommandsKeymap["Mod-Shift-`"] = setBlockType(schema.nodes.code_block);
    customCommandsKeymap["Mod-Shift-7"] = wrapInList(schema.nodes.ordered_list);
    customCommandsKeymap["Mod-Shift-8"] = wrapInList(schema.nodes.bullet_list);
    customCommandsKeymap["Mod-Shift-["] = liftListItem(schema.nodes.list_item);
    customCommandsKeymap["Mod-Shift-]"] = sinkListItem(schema.nodes.list_item);
    customCommandsKeymap["Enter"] = splitListItem(schema.nodes.list_item);
    customCommandsKeymap["Mod-Alt-9"] = wrapIn(schema.nodes.blockquote);
    customCommandsKeymap["Mod-Alt-0"] = setBlockType(schema.nodes.paragraph);
    customCommandsKeymap["Mod-Shift-_"] = (state, dispatch) => {
        if (dispatch) dispatch(state.tr.replaceSelectionWith(schema.nodes.horizontal_rule.create()).scrollIntoView());
        return true;
    };

    return customCommandsKeymap;
};