import { addToast } from "./client/lib/ui/notification_toast.store";
import type { ILeft2Write } from "../../types/plugins/l2w.types";
import { L2W_SERVER_HREF, L2W_URL_REGEX } from "./l2w.constants";
import { IS_ENV } from "../../globals";

export function convertToSentenceCase(text: string, allWords = false) {
    const textToModify: string | string[] = allWords ? text.split(/\s+/,) : text;

    if (allWords && Array.isArray(textToModify)) {
        return textToModify
            .map(word => word.charAt(0).toUpperCase() + text.slice(1).toLowerCase())
            .join(' ');
    }

    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export const convertDate = (inputDate: Date | string) => {
    const date = new Date(inputDate);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();

    return `${day} ${month} ${year} — ${date.toLocaleTimeString(
        "en-ZA",
        {
            timeStyle: "short"
        }
    )}`;
};

// Needs some improvement but this is fine for now
// NOTE: Okay new thing, have a damn description/summary but incase generate the description from the text
export function generatePostDescription(text: string, maxLength: number) {
    return text.substring(0, maxLength);
}

export function wordSpliter(text: string) {
    return text?.split(' ')
        .filter((char) => { return char != ''; });
}

export function updateWordCounter(text: string) {
    const words = wordSpliter(text);
    let wordString = "word";

    if (!words) {
        return;
    }

    if (words.length !== 1) {
        wordString += "s";
    }

    document.getElementById("lf-md-word_count").innerText = `${words.length} ${wordString}`;
}

export function isValidUrl(url: string) {
    try {
        const parsedUrl = new URL(url);
        if (!parsedUrl.protocol) {
            throw false;
        }

        return true;
    } catch (error) {
        const urlPattern = L2W_URL_REGEX;

        return !!urlPattern.test(url);
    }
}

export async function deletePost(postData: ILeft2Write) {
    const response = await fetch(`${L2W_SERVER_HREF}/posts/${postData.l2w_id}`, {
        method: "DELETE"
    });

    if (response.ok) {
        let message = `"${postData.l2w_title}" has been successfully deleted`;

        if (!postData.l2w_title.trim()) {
            message = "Post has been successfully deleted";
        }

        addToast({
            message,
            timeout: 3000
        });

        return true;
    } else {
        addToast({
            message: `${response.status} — ${(await response.json()).error}`,
            timeout: 3000
        });

        return false;
    }
}

export function copyToClipboard(text: string) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    document.execCommand('copy');
    document.body.removeChild(textArea);
}

/**
 * Pauses a process for a specified amount of time
 * @param {Number} time The amount of time to pause a process in milliseconds
 */
export const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

export function isBetween(val: number, min: number, max: number) {
    return val >= min && val <= max;
}

export function constructServiceURLs(url: string) {
    if (!IS_ENV.production || globalThis.window.location.port) {
        return "127.0.0.1";
    }

    return url;
}