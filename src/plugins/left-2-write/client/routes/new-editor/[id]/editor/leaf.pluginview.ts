import type { PluginView, EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { CorePluginViewSpec, CorePluginViewUserOptions, SvelteComponentNodeConstructor } from "../../../../../../../types/plugins/l2w.editor.types";
import { writable, type Writable } from "svelte/store";
import type { SvelteComponent } from "svelte";

export class SveltePluginView implements PluginView {
    view: EditorView = null;
    prevState?: EditorState = null;
    options: CorePluginViewUserOptions;
    component: SvelteComponentNodeConstructor;
    componentInstance: SvelteComponent<unknown, unknown, unknown>;
    root: HTMLElement;

    constructor(spec: CorePluginViewSpec) {
        this.view = spec.view;
        this.options = spec.options;
        this.component = this.options.component;

        spec.options.onCreate?.();

        let root = this.options.root?.(this.view.dom);

        if (!root) {
            root = this.view.dom.parentElement ?? document.body;
        }

        this.update(this.view, this.prevState);
        this.updateContext();

        this.render();
    }

    nodeContext = {
        view: writable(this.view),
        prevState: writable(this.prevState),
    };

    context = new Map(Object.entries(this.nodeContext));

    updateContext = () => {
        const original = {
            view: this.view,
            prevState: this.prevState,
            root: this.root,
        };

        Object.entries(original).forEach(([key, value]) => {
            const mapKey = key as keyof typeof original;
            const writable = this.context.get(mapKey) as Writable<typeof original[typeof mapKey]>;
            writable.set(value);
        });
    };

    update(view: EditorView, prevState: EditorState) {
        this.view = view;
        this.prevState = prevState;
        this.options.update?.(view, prevState, this.root);
    }

    destroy(): void {
        this.options.destroy?.();
        this.root.remove();
        this.componentInstance.$destroy();
    }

    render = () => {
        const component = new this.component({
            target: this.root,
            context: this.context,
        });

        this.componentInstance = component;

        return component;
    };
}

export const createSveltePluginView = (options: CorePluginViewUserOptions) => (view: EditorView) => {
    const pluginView = new SveltePluginView({
        view,
        options: {
            ...options,
            update: (view, prevState) => {
                options.update?.(view, prevState);
                pluginView.updateContext();
            },
            destroy: () => {
                options.destroy?.();
                pluginView.destroy();
            }
        }
    });

    return pluginView;
};