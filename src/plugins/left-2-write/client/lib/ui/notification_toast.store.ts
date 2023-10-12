import { writable } from "svelte/store";

export const toasts = writable([]);

export const dismissToast = (id: number) => {
    toasts.update((all) => all.filter((toast) => toast.id !== id));
};

/**
 * Original code: https://svelte.dev/repl/0091c8b604b74ed88bb7b6d174504f50?version=3.35.0
 */
export const addToast = (toast: { message?: string; dismissible?: boolean; timeout: number; }) => {
    // Create a unique ID so we can easily find/remove it
    // if it is dismissible/has a timeout.
    const id = Math.floor(Math.random() * 10000);

    // Setup some sensible defaults for a toast.
    const defaults = {
        id,
        dismissible: true,
        timeout: 3000,
    };

    // Push the toast to the top of the list of toasts
    toasts.update((allToasts) => [{ ...defaults, ...toast }, ...allToasts]);

    // If toast is dismissible, dismiss it after "timeout" amount of time.
    if (toast.timeout) {
        setTimeout(() => dismissToast(id), toast.timeout);
    }
};