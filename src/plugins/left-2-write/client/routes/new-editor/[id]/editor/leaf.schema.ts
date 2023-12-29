import { Schema } from "prosemirror-model";
import { attrsToObject } from "../leaf.utils";

export default new Schema({
    nodes: {
        doc: {
            content: "editor_header editor_body"
        },
        editor_header: {
            content: "title summary author+ last_saved",
            defining: true,
            isolating: true,
            toDOM: () => ['div', 0],
            parseDOM: [{ tag: 'div' }]
        },
        editor_body: {
            content: "body+",
            defining: true,
            isolating: true,
            toDOM: () => ['article', 0],
            parseDOM: [{ tag: 'article' }]
        },
        title: {
            content: "text*",
            group: "header",
            isolating: true,
            marks: "comment",
            toDOM: () => ['title', 0],
            parseDOM: [{ tag: 'title' }]
        },
        // `last_saved`, `author` and `summary` nodes are rendered with custom tags instead of heading tags
        // to avoid ProseMirror parsing them as body headings and not rendering the subsequent body headings correctly
        summary: {
            content: "text*",
            group: "header",
            isolating: true,
            marks: "comment",
            toDOM: () => ['summary', 0],
            parseDOM: [{ tag: 'summary' }]
        },
        last_saved: {
            content: "text*",
            group: "header",
            atom: true,
            selectable: false,
            marks: "",
            toDOM: () => ['last-saved', 0],
            parseDOM: [{ tag: 'last-saved' }]
        },
        author: {
            content: "text*",
            group: "header",
            atom: true,
            selectable: false,
            marks: "",
            toDOM: () => ['author', 0],
            parseDOM: [{ tag: 'author' }]
        },
        paragraph: {
            content: "inline*",
            group: "body",
            toDOM: () => ["p", 0],
            parseDOM: [{ tag: "p" }]
        },
        blockquote: {
            content: "paragraph+",
            group: "body",
            marks: "",
            defining: true,
            toDOM: () => ["blockquote", 0],
            parseDOM: [{ tag: "blockquote" }]
        },
        horizontal_rule: {
            group: "body",
            toDOM: () => ['hr'],
            parseDOM: [{ tag: "hr" }]
        },
        ordered_list: {
            group: "body",
            content: "list_item+",
            attrs: { order: { default: 1 } },
            parseDOM: [{
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                tag: "ol", getAttrs(dom: HTMLElement) {
                    return { order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1 };
                }
            }],
            toDOM(node) {
                return node.attrs.order == 1 ? ["ol", 0] : ["ol", { start: node.attrs.order }, 0];
            }
        },
        bullet_list: {
            group: "body",
            content: "list_item+",
            parseDOM: [{ tag: "ul" }],
            toDOM() { return ["ul", 0]; }
        },
        list_item: {
            content: "paragraph (ordered_list | bullet_list)*",
            parseDOM: [{ tag: "li" }],
            toDOM() { return ["li", 0]; },
            defining: true
        },
        heading: {
            attrs: { level: { default: 2 } },
            content: "text*",
            group: "body",
            defining: true,
            parseDOM: [
                // { tag: "h1", attrs: { level: 1 } },
                { tag: "h2", attrs: { level: 2 } },
                { tag: "h3", attrs: { level: 3 } },
                { tag: "h4", attrs: { level: 4 } },
                { tag: "h5", attrs: { level: 5 } },
                { tag: "h6", attrs: { level: 6 } }],
            toDOM(node) { return ["h" + node.attrs.level, 0]; }
        },
        code_block: {
            content: "text*",
            marks: "",
            group: "body",
            code: true,
            defining: true,
            toDOM: () => ["pre", ["code", { spellcheck: false, "data-hljs": "" }, 0]],
            parseDOM: [{ tag: "pre", preserveWhitespace: "full" }]
        },
        hard_break: {
            inline: true,
            group: "inline",
            selectable: false,
            parseDOM: [{ tag: "br" }],
            toDOM() { return ['br']; }
        },
        figure: {
            content: "image* figcaption",
            group: "body",
            marks: "",
            parseDOM: [{ tag: "figure" }],
            toDOM() { return ["figure", 0]; }
        },
        figcaption: {
            content: "inline*",
            group: "figure",
            marks: "strong link",
            parseDOM: [{ tag: "figcaption" }],
            toDOM() {
                return ["figcaption", 0];
            }
        },
        image: {
            atom: true,
            draggable: true,
            selectable: false,
            defining: true,
            isolating: true,
            group: "body",
            toDOM(node) {
                const credits = node.attrs["data-credits"];
                return ['figure', ['img', node.attrs], ['figcaption', { 'data-credits': credits }]];
            },
            parseDOM: [
                {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    tag: 'img', getAttrs(dom: HTMLElement) {
                        return attrsToObject(dom);
                    }
                }
            ],
            attrs: {
                src: {
                    default: ""
                },
                alt: {
                    default: ""
                },
                "img-id": {
                    default: ""
                },
                style: {
                    default: 'display:block;'
                },
                "data-credits": {
                    default: ""
                },
                "data-description": {
                    default: ""
                }
            }
        },
        text: { group: 'inline' }
    },
    marks: {
        strong: {
            parseDOM: [
                { tag: "strong" },
                // This works around a Google Docs misbehavior where
                // pasted content will be inexplicably wrapped in `<b>`
                // tags with a font-weight normal.
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                { tag: "b", getAttrs: (node: HTMLElement) => node.style.fontWeight != "normal" && null },
                { style: "font-weight=400", clearMark: mark => mark.type.name == "strong" },
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                { style: "font-weight", getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
            ],
            toDOM() { return ['strong', 0]; }
        },
        em: {
            parseDOM: [
                { tag: "i" }, { tag: "em" },
                { style: "font-style=italic" },
                { style: "font-style=normal", clearMark: mark => mark.type.name == "em" }
            ],
            toDOM() { return ['em', 0]; }
        },
        superscript: {
            parseDOM: [{ tag: "sup" }, { style: "vertical-align: sup" }],
            toDOM() { return ["sup", 0]; }
        },
        subscript: {
            parseDOM: [{ tag: "sub" }, { style: "vertical-align: sub" }],
            toDOM() { return ["sub", 0]; }
        },
        strikethrough: {
            parseDOM: [{ tag: "s" }],
            toDOM() { return ["s", 0]; }
        },
        highlight: {
            parseDOM: [{ tag: "mark" }],
            toDOM() { return ['mark', 0]; }
        },
        underline: {
            parseDOM: [{ tag: "u" }, { style: "text-decoration: underline" }],
            toDOM() { return ['span', { style: 'text-decoration: underline' }, 0]; }
        },
        link: {
            attrs: {
                href: {},
                title: { default: null }
            },
            inclusive: true,
            toDOM(node) {
                return ["a", { ...node.attrs, rel: "noopener noreffer", target: "_blank" }, 0];
            },
            parseDOM: [{
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                tag: "a[href]", getAttrs(dom: HTMLElement) {
                    return { href: dom.getAttribute("href"), title: dom.getAttribute("title") };
                }
            }]
        },
        code: {
            toDOM() { return ["code", { spellcheck: false }, 0]; },
            parseDOM: [{ tag: "code" }]
        },
        comment: {
            // Will be implemented at some point idk
        }
    }
});