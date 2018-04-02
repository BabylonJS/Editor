export default class Mobile {
    /**
     * Calls the navigator to vibrate with the given pattern
     * @param pattern the vibration pattern
     */
    public vibrate (pattern: number | number[]): boolean {
        return navigator.vibrate && navigator.vibrate(pattern);
    }
}