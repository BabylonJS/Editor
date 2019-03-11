/**
 * Main interface
 */
interface Mobile {
    vibrate (pattern: number | number[]): boolean;
}

declare var mobile: Mobile;
