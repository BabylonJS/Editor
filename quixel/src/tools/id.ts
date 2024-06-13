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
