import { EditorState, Plugin, TextSelection, type PluginView } from "prosemirror-state";
import LeafMenu from "$lib/editor/menu/leaf.floating_menu.svelte";
import type { EditorView } from "prosemirror-view";
import { dev } from "$app/environment";
import { showMenu } from "$lib/stores/editor";
import { get, writable, type Writable } from "svelte/store";

export const menuComponentStore = writable(null) as Writable<LeafMenu>;
export const menuViewStore = writable(null) as Writable<MenuView>;

export class MenuView implements PluginView {
    view: EditorView;
    floatingMenu: HTMLDivElement;
    component: LeafMenu;
    prevState: EditorState;
    shortcut: boolean;

    constructor(view: EditorView, shortcut?: boolean) {
        this.view = view;
        this.shortcut = shortcut;

        this.createMenuContainer();
        view.dom.parentNode.appendChild(this.floatingMenu);

        if (shortcut === false) {
            this.render();
        }

        this.update(view, null);
    }

    updates = 1;

    private createMenuContainer() {
        const intialDiv = document.querySelector('[data-menu-container]') as HTMLDivElement;

        if (intialDiv) {
            this.floatingMenu = intialDiv;
        } else {
            this.floatingMenu = document.createElement('div');
            this.floatingMenu.className = 'lf-floating-container';
            this.floatingMenu.setAttribute('data-menu-container', '');
        }


        return this.floatingMenu;
    }

    componentDestroy() {
        showMenu.set(false);
        this.floatingMenu.style.display = "none";

        get(menuComponentStore)?.$destroy();
        menuComponentStore.set(null);
    }

    update = (view: EditorView, prevState: EditorState) => {
        const root = this.floatingMenu;
        const state = view.state;
        const selection = state.selection;
        const notAllowedNodeTypes = ["code_block", "blockquote", "editor_header"];
        const menuComp = get(menuComponentStore);
        let currentNode = selection.$from.parent;
        this.prevState = prevState;

        if (prevState && prevState.doc.eq(state.doc)
            && prevState.selection.eq(selection)) {
            return;
        }

        const selectionSize = state.doc.textBetween(selection.from, selection.to).length;
        // I might end up using this again later, but for now the menu popping up every time
        // a new blank paragraph is created is a bit annoying
        // ----------------------------------------------------------------
        // let paragraphHasContent = currentNode.textContent;

        if (selection instanceof TextSelection && selection.$cursor?.parent) {
            currentNode = selection.$cursor.parent;
            // paragraphHasContent = currentNode.textContent;
        }

        if (notAllowedNodeTypes.includes(currentNode.type.name)) {
            if (menuComp !== null) {
                if (dev) {
                    console.log("i'm running here");
                }
                
                this.componentDestroy();
            }

            return;
        }

        const hasFocus = view.hasFocus() || this.floatingMenu.contains(document.activeElement);

        // if ((!selectionSize && !!paragraphHasContent === true) || hasFocus === false) {
        if ((!selectionSize) || hasFocus === false) {
            if (dev) {
                console.log("i might be running here");
            }

            this.componentDestroy();

            return;

            // I can't remember now why the below was added. Maybe it'll come up again.
            // and I should comment on why
            // if (menuComp === null) {
            //     return;
            // }
        }

        // if (!selectionSize) {
        //     return;
        // }

        if (dev) {
            console.log("Menu updates", this.updates++);
        }

        if (root.style.display === "none") {
            this.render();
        }

        this.placeMenu();
    };

    destroy = () => {
        this.floatingMenu.remove();
        this.componentDestroy();
    };

    placeMenu() {
        const root = this.floatingMenu;
        const view = this.view;
        const state = view.state;
        const selection = state.selection as TextSelection;
        const currentNode = selection.$from.parent;
        const paragraphHasContent = currentNode.textContent;

        if (get(showMenu) === false) {
            root.style.display = "";
            showMenu.set(true);
        }

        const { from, to } = selection;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        const box = root.offsetParent.getBoundingClientRect();

        const left = Math.max((start.left + end.left) / 2, start.left + 3);
        const bottom = (box.bottom - start.top);

        if (!paragraphHasContent) {
            root.style.left = left + (left / 2) + "px";
            root.style.bottom = (bottom - 50) + "px";

            return;
        }

        root.style.left = (left - box.left) + "px";
        root.style.bottom = (box.bottom - start.top) + 10 + "px";
    }

    render() {
        this.component = new LeafMenu({
            target: this.floatingMenu
        });

        menuComponentStore.set(this.component);
        this.placeMenu();
    }
}

const menuPlugin = new Plugin({
    view: (view) => {
        const menuView = new MenuView(view);
        menuViewStore.set(menuView);

        return menuView;
    }
});

export default menuPlugin;