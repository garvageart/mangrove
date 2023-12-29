import type { Attrs, Node } from "prosemirror-model";
import type { Decoration, DecorationSource, EditorView, NodeView, NodeViewConstructor } from "prosemirror-view";
import { getContext, type ComponentConstructorOptions, type SvelteComponent } from "svelte";
import { writable, type Writable } from "svelte/store";
import type { ComponentNodeViewOptions, ComponentNodeViewUserOptions, NodeViewContext } from "../../../../../../../types/plugins/l2w.editor.types";
import { dev } from "$app/environment";
import { objectToAttrs } from "../leaf.utils";

let constructorCounter = 1;
// Extensively adapted from https://github.com/Saul-Mirone/prosemirror-adapter/blob/main/packages/svelte/
// Shout out to them for the original code, which made this much easier to figure out
export class LeafNodeView implements NodeView {
    dom;
    contentDOM: HTMLElement | null;
    component: new (options: ComponentConstructorOptions) => SvelteComponent;
    view: EditorView = null;
    node: Node = null;
    getPos: () => number | undefined = null;
    decorations: readonly Decoration[] = null;
    innerDecorations: DecorationSource = null;
    selected = false;
    options;
    componentInstance: SvelteComponent<unknown, unknown, unknown>;
    setSelection: (anchor: number, head: number, root: Document | ShadowRoot) => void;
    stopEvent?(event: Event): boolean;

    constructor(
        { node, view, getPos, decorations, innerDecorations }: ComponentNodeViewOptions,
        options: ComponentNodeViewUserOptions
    ) {
        this.component = options.component;

        this.node = node;
        this.getPos = getPos;
        this.view = view;

        this.context.set('view', this.view);
        this.context.set('getPos', this.getPos);

        this.decorations = decorations;
        this.innerDecorations = innerDecorations;
        this.options = options;

        this.dom = this.createElement(options.parentNode?.element ?? options.element);

        if (node.isLeaf || node.isAtom) {
            this.contentDOM = null;
        } else {
            this.contentDOM = this.createElement(options.contentNode?.element ?? options.contentElement);
        }

        this.setSelection = options.setSelection;
        this.stopEvent = options.stopEvent;

        if (dev) {
            console.log(`building ${this.node.type.name}`, constructorCounter++);
        }

        this.updateContext();
        this.render();
    }

    protected createElement(as?: string | HTMLElement | ((inputNode: Node) => HTMLElement)) {
        const node = this.node;
        return !as
            ? document.createElement(node.isInline ? "span" : "div")
            : as instanceof HTMLElement
                ? as
                : as instanceof Function
                    ? as(node)
                    : document.createElement(as);
    }

    nodeContext = {
        contentRef: (element: HTMLElement) => {
            if (
                element
                && this.contentDOM
                && element.firstChild !== this.contentDOM
            ) {
                element.appendChild(this.contentDOM);
                this.dom.setAttribute('data-parent-node', 'true');
                
                if (this.options.parentNode?.attributes) {
                    objectToAttrs(this.dom, this.options.parentNode.attributes);
                }
            }

            if (!this.contentDOM) {
                this.dom.appendChild(element);
                this.dom.setAttribute('data-parent-node', 'true');

                if (this.options.parentNode?.attributes) {
                    objectToAttrs(this.dom, this.options.parentNode.attributes);
                }

                element.setAttribute('data-content-node', 'true');
            }

            if (this.contentDOM) {
                this.contentDOM.setAttribute('data-content-node', 'true');
                this.contentDOM.style.whiteSpace = 'inherit';

                if (this.options.contentNode?.attributes) {
                    objectToAttrs(this.contentDOM, this.options.contentNode.attributes);
                }
            }
        },
        setAttrs: (attrs: Attrs) => {
            const { dispatch, state } = this.view;
            const pos = this.getPos();

            if (typeof pos !== "number") return;

            if (dev) {
                console.log("Setting attributes", { ...this.node.attrs, ...attrs });
            }

            const updatedState = state.tr.setNodeMarkup(pos, null, {
                ...this.node.attrs,
                ...attrs
            });

            dispatch(updatedState);
        },
        view: this.view,
        getPos: this.getPos,
        node: writable(this.node),
        selected: writable(this.selected),
        decorations: writable(this.decorations),
        innerDecorations: writable(this.innerDecorations)
    };

    context = new Map(Object.entries(this.nodeContext));

    updateContext = () => {
        const componentContext = {
            node: this.node,
            selected: this.selected,
            decorations: this.decorations,
            innerDecorations: this.innerDecorations
        };

        Object.entries(componentContext).forEach(([key, value]) => {
            const mapKey = key as keyof typeof componentContext;
            const writable = this.context.get(mapKey) as unknown as Writable<(typeof componentContext)[typeof mapKey]>;
            writable.set(value);
        });
    };

    selectNode = () => {
        this.selected = true;
    };

    deselectNode = () => {
        this.selected = false;
        this.options.deselectNode?.();
    };

    shouldUpdate = (node: Node): boolean => {
        if (node.type !== this.node.type) return false;

        // if (this.view.dom === this.dom) return false

        if (node.sameMarkup(this.node) && node.content.eq(this.node.content)) return false;

        return true;
    };

    update = (node: Node, decorations: readonly Decoration[], innerDecorations: DecorationSource): boolean => {
        const userUpdate = this.options.update;
        let result;

        if (userUpdate) result = userUpdate(node, decorations, innerDecorations);

        if (typeof result !== "boolean") result = this.shouldUpdate(node);

        this.node = node;
        this.decorations = decorations;
        this.innerDecorations = innerDecorations;

        if (result) this.options.onUpdate?.();

        return result;
    };

    shouldIgnoreMutation = (mutation: MutationRecord): boolean => {
        if (!this.dom || !this.contentDOM) return true;

        // if (this.node.nodeSize === 0) return true

        if (this.node.isLeaf || this.node.isAtom) return true;

        if ((mutation.type as unknown) === "selection") return false;

        if (this.contentDOM === mutation.target && mutation.type === "attributes") return true;

        if (this.contentDOM.contains(mutation.target)) return false;

        return true;
    };

    ignoreMutation: (mutation: MutationRecord) => boolean = (mutation) => {
        if (!this.dom || !this.contentDOM) return true;

        let result;

        const userIgnoreMutation = this.options.ignoreMutation;

        if (userIgnoreMutation) result = userIgnoreMutation(mutation);

        if (typeof result !== "boolean") result = this.shouldIgnoreMutation(mutation);

        return result;
    };

    destroy = () => {
        this.dom.remove();
        this.contentDOM?.remove();
        this.componentInstance.$destroy();
    };

    render = () => {
        const component = new this.component({
            target: this.dom as HTMLElement,
            context: this.context
        });

        this.componentInstance = component;
        return component;
    };
}

export const createSvelteNodeView =
    (options: ComponentNodeViewUserOptions): NodeViewConstructor =>
        (
            node: Node,
            view: EditorView,
            getPos: () => number | undefined,
            decorations: readonly Decoration[],
            innerDecorations: DecorationSource
        ) => {
            if (options.customNodeView) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return new options.customNodeView(node,
                    view,
                    getPos,
                    decorations,
                    innerDecorations);
            } else {
                const nodeView = new LeafNodeView(
                    {
                        node,
                        view,
                        getPos,
                        decorations,
                        innerDecorations
                    },
                    {
                        ...options,
                        onUpdate() {
                            options.onUpdate?.();
                            nodeView.updateContext();
                        },
                        selectNode() {
                            options.selectNode?.();
                            nodeView.updateContext();
                        },
                        deselectNode() {
                            options.deselectNode?.();
                            nodeView.updateContext();
                        },
                        destroy() {
                            options.destroy?.();
                        }
                    }
                );

                return nodeView;
            }

        };

export const useNodeViewContext = <Key extends keyof NodeViewContext>(key: Key): NodeViewContext[Key] => getContext(key);