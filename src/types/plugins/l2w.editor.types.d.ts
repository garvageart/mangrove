import type { ComponentConstructorOptions, SvelteComponent } from "svelte";
import type { Decoration, DecorationSource, EditorView } from "prosemirror-view";
import type { Attrs, Node } from "prosemirror-model";
import type { PostStatus } from "./l2w.types";
import type { OutputInfo } from "sharp";

export type EditorPostStatus = PostStatus | 'saving' | 'saved' | 'publishing' | 'published';

export interface ImageUploadFileData {
    metadata: {
        postID: string,
        name: string,
        size: number,
        directory: string;
    },
    data: string;
}
export interface ImageUploadSuccess {
    url: string;
    id: string;
    metadata: OutputInfo;
}

export type KeymapBindings = {
    [keyBinding: string]: Command;
};

export interface CorePluginViewUserOptions {
    component: SvelteComponentNodeConstructor;
    root?: (viewDOM: HTMLElement) => HTMLElement;
    onCreate?: () => void;
    update?: (view: EditorView, prevState: EditorState, root?: HTMLElement) => void;
    destroy?: () => void;
}

export interface CorePluginViewSpec {
    view: EditorView;
    options: CorePluginViewUserOptions;
}

export type WidgetDecoration = typeof Decoration.widget;
export type WidgetDecorationSpec = NonNullable<Parameters<WidgetDecoration>[2]>;
export interface CoreWidgetViewUserOptions {
    as: string | HTMLElement;
    component: SvelteComponentNodeConstructor;
}
export interface CoreWidgetViewSpec {
    pos: number;
    spec?: WidgetDecorationSpec;
    options: CoreWidgetViewUserOptions;
}

type NodeViewElementTags = keyof HTMLElementTagNameMap;
export type NodeViewDOMSpec = NodeViewElementTags & string | HTMLElement | ((node: Node) => HTMLElement);

export type SvelteComponentNodeConstructor = new (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: ComponentConstructorOptions<SvelteComponent extends SvelteComponent<infer Props> ? Props : Record<string, any>>
) => SvelteComponent;

export interface ComponentNodeViewUserOptions {
    component: SvelteComponentNodeConstructor;
    customNodeView?: NodeView;
    parentNode?: {
        attributes?: object;
        element?: NodeViewDOMSpec;
    };
    contentNode?: {
        attributes?: object;
        element?: NodeViewDOMSpec;
    };
    contentElement?: NodeViewDOMSpec;
    element?: NodeViewDOMSpec;
    attrs?: Attrs;
    update?: (node: Node, decorations: readonly Decoration[], innerDecorations: DecorationSource) => boolean | void;
    ignoreMutation?: (mutation: MutationRecord) => boolean | void;
    selectNode?: () => void;
    deselectNode?: () => void;
    setSelection?: (anchor: number, head: number, root: Document | ShadowRoot) => void;
    stopEvent?: (event: Event) => boolean;
    destroy?: () => void;
    onUpdate?: () => void;
}

export interface NodeViewContext {
    contentRef: (node: HTMLElement | null, editable?: boolean) => void;
    view: EditorView;
    getPos: () => number | undefined;
    setAttrs: (attrs: Attrs) => void;
    node: Writable<Node>;
    selected: Writable<boolean>;
    decorations: Writable<readonly Decoration[]>;
    innerDecorations: Writable<DecorationSource>;
}

export interface ComponentNodeViewOptions {
    node?: Node;
    view?: EditorView;
    getPos?: () => number | undefined;
    decorations?: readonly Decoration[];
    innerDecorations?: DecorationSource;
}
