/* eslint-disable @typescript-eslint/naming-convention */

interface Keyboard {
	getLayoutMap(): Promise<KeyboardLayoutMap>;
}

interface KeyboardLayoutMap {
	get(code: string): string | undefined;
	entries(): IterableIterator<[string, string]>;
}

declare interface Navigator {
	keyboard?: Keyboard;
}
