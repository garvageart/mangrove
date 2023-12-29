import type { Node } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin, TextSelection } from "prosemirror-state";

// Words you probably shouldn't use
const badWords = /\b(obviously|clearly|evidently|simply)\b/ig;
// Matches punctuation with a space before it
const badPunc = / ([,.!?:]) ?/g;

function lintDeco(doc: Node) {
    const decos: Decoration[] = [];
    lint(doc).forEach(prob => {
        decos.push(Decoration.inline(prob.from, prob.to, { class: "problem" }),
            Decoration.widget(prob.from, lintIcon(prob)));
    });
    return DecorationSet.create(doc, decos);
}

function lintIcon(prob: { msg: string; }) {
    const icon = document.createElement("div");
    icon.className = "lint-icon";
    icon.title = prob.msg;
    icon.problem = prob;
    return icon;
}

function fixPunc(replacement: string) {
    return  ({ state, dispatch }) => {
        dispatch(state.tr.replaceWith(this.from, this.to,
            state.schema.text(replacement)));
    };
}

function fixHeader(level: number) {
    return function ({ state, dispatch }) {
        dispatch(state.tr.setNodeMarkup(this.from - 1, null, { level }));
    };
}

function addAlt(this: any, { state, dispatch }) {
    const alt = prompt("Alt text", "");
    if (alt) {
        const attrs = Object.assign({}, state.doc.nodeAt(this.from).attrs, { alt });
        dispatch(state.tr.setNodeMarkup(this.from, null, attrs));
    }
}

function lint(doc: Node) {
    const result: { msg: any; from: any; to: any; fix: any; }[] = [];
    let lastHeadLevel: number = null;

    function record(msg: string, from: number, to: number, fix: { ({ state, dispatch }: { state: any; dispatch: any; }): void; ({ state, dispatch }: { state: any; dispatch: any; }): void; ({ state, dispatch }: { state: any; dispatch: any; }): void; }) {
        result.push({ msg, from, to, fix });
    }

    // For each node in the document
    doc.descendants((node, pos) => {
        if (node.isText) {
            // Scan text nodes for suspicious patterns
            let m;
            // eslint-disable-next-line no-cond-assign
            while (m = badWords.exec(node.text))
                record(`Try not to say '${m[0]}'`,
                    pos + m.index, pos + m.index + m[0].length);
            // eslint-disable-next-line no-cond-assign
            while (m = badPunc.exec(node.text))
                record("Suspicious spacing around punctuation",
                    pos + m.index, pos + m.index + m[0].length,
                    fixPunc(m[1] + " "));
        } else if (node.type.name == "heading") {
            // Check whether heading levels fit under the current level
            const level = node.attrs.level;
            if (lastHeadLevel != null && level > lastHeadLevel + 1)
                record(`Heading too small (${level} under ${lastHeadLevel})`,
                    pos + 1, pos + 1 + node.content.size,
                    fixHeader(lastHeadLevel + 1));
            lastHeadLevel = level;
        } else if (node.type.name == "image" && !node.attrs.alt) {
            // Ensure images have alt text
            record("Image without alt text", pos, pos + 1, addAlt);
        }
    });

    return result;
}

const lintPlugin = new Plugin({
    state: {
        init(_, { doc }) { return lintDeco(doc); },
        apply(tr, old) { return tr.docChanged ? lintDeco(tr.doc) : old; }
    },
    props: {
        decorations(state) { return this.getState(state); },
        handleClick(view, _, event) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (/lint-icon/.test(event.target.className)) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const { from, to } = event.target.problem;
                view.dispatch(
                    view.state.tr
                        .setSelection(TextSelection.create(view.state.doc, from, to))
                        .scrollIntoView());
                return true;
            }
        },
        handleDoubleClick(view, _, event) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (/lint-icon/.test(event.target.className)) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const prob = event.target.problem;
                if (prob.fix) {
                    prob.fix(view);
                    view.focus();
                    return true;
                }
            }
        }
    }
});