import { Fragment, Slice } from "prosemirror-model";
import { Plugin, TextSelection } from "prosemirror-state";
import { DecorationSet, Decoration, EditorView } from "prosemirror-view";
import { getContext, onMount } from "svelte";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const editor = window.view as EditorView;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cancelMouseDown(this: any, e: Event) {
    // stop evt
    e.preventDefault();
    e.stopPropagation();
    // dom	                  				
    const element = e.currentTarget;
    // remove listener	                  				
    element.removeEventListener('mousedown', cancelMouseDown);
    // dispatch trans
    const tr = editor.state.tr;
    const wrap_cap = new Slice(Fragment.from(editor.state.schema.nodes.figcaption.create()), 0, 0);
    tr.setMeta(captionPlugin, { remove: {} });
    tr.replace(this, this, wrap_cap);
    editor.dispatch(tr);
    const newPos = editor.state.doc.resolve(this);
    const newSel = TextSelection.between(newPos, newPos);
    editor.dispatch(editor.state.tr.setSelection(newSel).scrollIntoView());

}

const captionPlugin = new Plugin({
    state: {
        init() { return DecorationSet.empty; },
        apply(tr, set) {
            set = set.map(tr.mapping, tr.doc);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const action = tr.getMeta(this);
            if (action && action.add) {
                // create deco 
                const widget = document.createElement("figcaption");
                widget.className = "decoration";
                widget.addEventListener('mousedown', cancelMouseDown.bind(action.add.pos));

                const deco = Decoration.widget(action.add.pos, widget, { id: action.add.id });
                // remove all
                set = set.remove(set.find(null, null,
                    spec => spec.id != null));
                // add new
                set = set.add(tr.doc, [deco]);
            } else { // not only if (action && action.remove) 
                // remove all
                set = set.remove(set.find(null, null,
                    spec => spec.id != null));
            }
            return set;
        }
    },
    props: {
        decorations(state) { return this.getState(state); },
        handleDOMEvents: {
            mousedown(view, e) {
                const target = e.target as HTMLElement;
                if (target.nodeName == "IMG" && target.parentNode.lastElementChild.nodeName != "FIGCAPTION") {
                    const id = {};
                    const tr = view.state.tr;
                    const pos = view.posAtDOM(target, 0);
                    tr.setMeta(captionPlugin, { add: { id, pos: (pos + 1) } });
                    view.dispatch(tr);
                }
                return true;
            }
        }
    }
});

export default captionPlugin;