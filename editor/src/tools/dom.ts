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

/**
 * Returns wether or not the given DOM element is a descendant of the given parent.
 * @param element defines the reference to the DOM element to check.
 * @param parent defines the reference to the parent DOM element to check against.
 */
export function isDomElementDescendantOf(element: HTMLElement, parent: HTMLElement): boolean {
    while (element) {
        if (element === parent) {
            return true;
        }

        element = element.parentElement!;
    }

    return false;
}
