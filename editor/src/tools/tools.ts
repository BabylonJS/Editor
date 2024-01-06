/**
 * Wait for a given amount of time expressed in milliseconds.
 * @param timeMs The time to wait in milliseconds.
 * @returns A promise that resolves after the given amount of time.
 */
export function wait(timeMs: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), timeMs));
}

/**
 * Wait for the next animation frame.
 * @returns A promise that resolves after the next animation frame.
 */
export function waitNextAnimationFrame(): Promise<void> {
    return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Generates a unique number value based on date.
 * Takes care if a number is generated at the same millisecond as the previous one.
 * @example myNode.uniqueId = UniqueNumber.Get();
 */
export class UniqueNumber {
    private static _Previous = 0;

    public static Get(): number {
        let date = Date.now();

        // If created at same millisecond as previous
        if (date <= UniqueNumber._Previous) {
            date = ++UniqueNumber._Previous;
        } else {
            UniqueNumber._Previous = date;
        }

        return date;
    }
}

/**
 * Returns the power of two sizes until the given limit.
 * @param limit The limit size.
 * @param from The starting size. Default is 1.
 * @returns An array of power of two sizes.
 */
export function getPowerOfTwoSizesUntil(limit: number = 4096, from?: number): number[] {
    let size = from ?? 1;

    const result: number[] = [];

    while (size <= limit) {
        result.push(size);
        size <<= 1;
    }

    return result;
}
