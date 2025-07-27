import { Tools } from "babylonjs";

/**
 * Wait for a given amount of time expressed in milliseconds.
 * @param timeMs The time to wait in milliseconds.
 * @returns A promise that resolves after the given amount of time.
 */
export function wait(timeMs: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(() => resolve(), timeMs);
	});
}

/**
 * Wait for the next animation frame.
 * @returns A promise that resolves after the next animation frame.
 */
export function waitNextAnimationFrame(): Promise<void> {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});
}

/**
 * Wait until a given predicate returns true.
 * @param predicate Defines the predicate to wait for.
 */
export async function waitUntil(predicate: () => any): Promise<void> {
	while (!predicate()) {
		await wait(150);
	}
}

/**
 * Generates a unique number value based on date.
 * Takes care if a number is generated at the same millisecond as the previous one.
 * @example myNode.uniqueId = UniqueNumber.Get();
 */
export class UniqueNumber {
	private static _previous = 0;

	public static Get(): number {
		let date = Date.now();

		// If created at same millisecond as previous
		if (date <= UniqueNumber._previous) {
			date = ++UniqueNumber._previous;
		} else {
			UniqueNumber._previous = date;
		}

		return date;
	}
}

/**
 * Returns a new array composed of distinct elements.
 * @param array defines the reference to the source array.
 */
export function unique<T>(array: T[]): T[] {
	const unique = (value: T, index: number, self: T[]) => {
		return self.indexOf(value) === index;
	};

	return array.filter(unique);
}

/**
 * Sorts the given array alphabetically.
 * @param array defines the array containing the elements to sort alphabetically.
 * @param property in case of an array of objects, this property will be used to get the right value to sort.
 */
export function sortAlphabetically(array: any[], property?: string): any[] {
	array.sort((a, b) => {
		a = property ? a[property] : a;
		b = property ? b[property] : b;

		a = a.toUpperCase();
		b = b.toUpperCase();

		return a < b ? -1 : a > b ? 1 : 0;
	});

	return array;
}

/**
 * Returns the current call stack as a string.
 * This is mainly used to check if the current call is from outside of the editor.
 * @example
 * if (getCurrentCallStack().includes(projectDir)) {
 * 	// We know that it comes from the project directory and not from the editor.
 * }
 */
export function getCurrentCallStack(): string {
	return new Error().stack ?? "";
}

/**
 * Clones the given JavaScript object. This function does not handle cyclic references.
 * @param source defines the reference to the JavaScript object to clone.
 */
export function cloneJSObject<T>(source: T): T {
	return JSON.parse(JSON.stringify(source));
}

/**
 * Reads a blob and returns its data as a data URL.
 * @param blob defines the reference to the blob to read as data URL.
 */
export function readBlobAsDataUrl(blob: Blob): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		Tools.ReadFileAsDataURL(
			blob,
			(dataUrl) => {
				if (dataUrl) {
					resolve(dataUrl);
				} else {
					reject("Failed to read blob as data URL");
				}
			},
			undefined!
		);
	});
}

/**
 * Represents a cancellation token that can be used to signal cancellation requests.
 * @example
 * const cancellationToken = new CancellationToken();
 *
 * // Somewehre in the app
 * cancellationToken.cancel(); // To signal cancellation
 *
 * // Where the cancellation should be checked
 * if (cancellationToken.isCancelled) {
 *   // Handle cancellation
 * }
 */
export class CancellationToken {
	private _isCancelled: boolean = false;

	/**
	 * Gets a value indicating whether the cancellation has been requested.
	 */
	public get isCancelled(): boolean {
		return this._isCancelled;
	}

	/**
	 * Sets the value indicating that cancellation has been requested.
	 */
	public cancel(): void {
		this._isCancelled = true;
	}
}
