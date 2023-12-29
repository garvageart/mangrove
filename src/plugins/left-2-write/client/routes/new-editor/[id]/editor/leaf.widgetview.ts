import type { EditorView } from "prosemirror-view";
import type { CoreWidgetViewSpec, CoreWidgetViewUserOptions, SvelteComponentNodeConstructor, WidgetDecorationSpec } from "../../../../../../../types/plugins/l2w.editor.types";
import type { SvelteComponent } from "svelte";

export class SvelteWidgetView {
    dom: HTMLElement;
    pos: number;
    view?: EditorView;
    getPos?: () => number | undefined;
    spec?: WidgetDecorationSpec;

    options: CoreWidgetViewUserOptions;
    component: SvelteComponentNodeConstructor;
    componentInstance: SvelteComponent<unknown, unknown, unknown>;

    constructor({ pos, spec, options }: CoreWidgetViewSpec) {
        this.pos = pos;
        this.options = options;
        this.spec = spec;

        this.dom = this.createElement(options.as);
        this.dom.setAttribute('data-widget-view-root', 'true');
    }

    private createElement(as: string | HTMLElement) {
        return as instanceof HTMLElement
            ? as
            : document.createElement(as);
    }

    nodeContext = {
        view: this.view,
        getPos: this.getPos,
        spec: this.spec,
    };

    context = new Map(Object.entries(this.nodeContext));

    updateContext = () => {
        const original = {
            view: this.view,
            getPos: this.getPos,
            spec: this.spec,
        };

        Object.entries(original).forEach(([key, value]) => {
            this.context.set(key as keyof typeof original, value);
        });
    };

    bind(view: EditorView, getPos: () => number | undefined) {
        this.view = view;
        this.getPos = getPos;
    }

    render() {
        const component = new this.component({
            target: this.dom,
            context: this.context,
        });

        this.componentInstance = component;

        return component;
    }
}