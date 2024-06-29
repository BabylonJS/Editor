export function getPowerOfTwoUntil(limit: number): number {
    let size = 1;

    while (size <= limit) {
        size <<= 1;
    }

    return size >> 1;
}
