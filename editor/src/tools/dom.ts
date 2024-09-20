/**
 * Returns wether or not the given DOM element is focusable.
 * Aka `input`, `select`, `button`, `textarea` etc.
 * @param element defines the reference to the DOM element to check.
 * @returns wether or not the given DOM element is focusable.
 */
export function isDomElementFocusable(element: Element | null | undefined): boolean {
    if (!element) {
        return false;
    }

    const inputs = ["input", "select", "button", "textarea"];
    return inputs.includes(element.tagName.toLowerCase());
}
