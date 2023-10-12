export function convertToSentenceCase(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export const convertDate = (inputDate: Date) => {
    const date = inputDate;
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
export function generatePostDescription(text: string, maxLength: number) {
    return text.substring(0, maxLength);
}