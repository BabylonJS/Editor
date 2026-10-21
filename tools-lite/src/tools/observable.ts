/**
 * Represents a callback registered in an observable. Babylon Lite is fully functional and doesn't provide
 * observables: the tools use these ones to let scripts, cinematics, sounds, etc. register and unregister
 * callbacks at any time.
 */
export class Observer<T> {
	/**
	 * Defines wether or not the observer is removed after its first call.
	 */
	public readonly once: boolean;
	/**
	 * Defines the callback called when the observable notifies its observers.
	 */
	public readonly callback: (eventData: T) => void;

	/**
	 * @internal
	 */
	public _removed: boolean = false;

	private _observable: Observable<T> | null;

	public constructor(observable: Observable<T>, callback: (eventData: T) => void, once: boolean) {
		this.once = once;
		this.callback = callback;

		this._observable = observable;
	}

	/**
	 * Removes the observer from its observable so its callback is not called anymore.
	 */
	public remove(): void {
		this._observable?.remove(this);
		this._observable = null;
	}
}

export class Observable<T> {
	private _observers: Observer<T>[] = [];

	/**
	 * Returns the number of observers registered in the observable.
	 */
	public get observersCount(): number {
		return this._observers.length;
	}

	/**
	 * Registers the given callback, called each time the observable notifies its observers.
	 * @param callback defines the callback to register.
	 * @returns the observer that can be removed later.
	 */
	public add(callback: (eventData: T) => void): Observer<T> {
		const observer = new Observer<T>(this, callback, false);
		this._observers.push(observer);

		return observer;
	}

	/**
	 * Registers the given callback, called only the next time the observable notifies its observers.
	 * @param callback defines the callback to register.
	 * @returns the observer that can be removed later.
	 */
	public addOnce(callback: (eventData: T) => void): Observer<T> {
		const observer = new Observer<T>(this, callback, true);
		this._observers.push(observer);

		return observer;
	}

	/**
	 * Removes the given observer from the observable.
	 * @param observer defines the reference to the observer to remove.
	 * @returns true if the observer was registered in the observable.
	 */
	public remove(observer: Observer<T> | null | undefined): boolean {
		if (!observer || observer._removed) {
			return false;
		}

		const index = this._observers.indexOf(observer);
		if (index === -1) {
			return false;
		}

		observer._removed = true;
		this._observers.splice(index, 1);

		return true;
	}

	/**
	 * Removes the first observer registered with the given callback.
	 * @param callback defines the callback to remove.
	 * @returns true if an observer was registered with the given callback.
	 */
	public removeCallback(callback: (eventData: T) => void): boolean {
		const observer = this._observers.find((o) => o.callback === callback);
		return this.remove(observer);
	}

	/**
	 * Returns wether or not the observable has at least one observer registered.
	 */
	public hasObservers(): boolean {
		return this._observers.length > 0;
	}

	/**
	 * Calls the callbacks of all the registered observers. The observers added while notifying are only called
	 * the next time the observable notifies its observers, the ones removed while notifying are not called anymore.
	 * @param eventData defines the data to give to the callbacks.
	 */
	public notifyObservers(eventData: T): void {
		if (!this._observers.length) {
			return;
		}

		const observers = this._observers.slice();

		for (let i = 0, len = observers.length; i < len; ++i) {
			const observer = observers[i];
			if (observer._removed) {
				continue;
			}

			if (observer.once) {
				observer.remove();
			}

			observer.callback(eventData);
		}
	}

	/**
	 * Removes all the observers of the observable.
	 */
	public clear(): void {
		this._observers.forEach((observer) => (observer._removed = true));
		this._observers.splice(0, this._observers.length);
	}
}
