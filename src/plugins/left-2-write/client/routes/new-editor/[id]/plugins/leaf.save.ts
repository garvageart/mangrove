import { editorContents, editorStatus, hasUserInput } from "left-2-write/lib/stores/editor";
import { Plugin } from "prosemirror-state";
import { saveDocument } from "../leaf.utils";
import { dev } from "$app/environment";
import { get } from "svelte/store";

const savePlugin = new Plugin({
    props: {
        handleDOMEvents: {
            keydown: (_view, event) => {
                // If any text selections are made without text changes, don't save
                if (
                    event.key.includes('Arrow') ||
                    (event.key.includes('Arrow') && event.shiftKey) ||
                    (event.key.includes('Arrow') && event.ctrlKey)
                ) {
                    if (dev) {
                        console.log('Moving and just making selections');
                    }

                    return false;
                }

                // Cancel any saves if only modifier keys are pressed
                if (event.altKey || event.key.includes('Alt')) {
                    return false;
                } else if (event.shiftKey && event.key.includes('Shift')) {
                    return false;
                } else if (event.ctrlKey || event.key.includes('Control')) {
                    return false;
                }

                const isUserInputStatus = get(hasUserInput);

                if (!isUserInputStatus) {
                    return false;
                }

                const timer = savePlugin.spec.timer as ReturnType<typeof Window.prototype.setTimeout>;
                clearTimeout(timer);

                editorStatus.set('saving');

                const updatedContents = get(editorContents);

                savePlugin.spec.timer = setTimeout(() => {
                    const timeoutDate = new Date();

                    if (dev) {
                        console.log('New timeout -', timeoutDate);
                        console.log("Now saving after a 1000ms delay at", timeoutDate, updatedContents,);
                    }

                    saveDocument(updatedContents);
                }, 1000);

                return true;
            }
        }
    },
    timer: null as ReturnType<typeof Window.prototype.setTimeout>
});

export default savePlugin;