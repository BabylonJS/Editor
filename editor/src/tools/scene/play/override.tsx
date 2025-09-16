import { isAbsolute } from "path";
import { join, dirname } from "path/posix";

import { Engine, WebRequest, Observable, Observer, ExitPointerlock, ExitFullscreen } from "babylonjs";

import { getCurrentCallStack } from "../../tools";

import { Editor } from "../../../editor/main";

const savedConsoleMethods: Record<string, any> = {
	log: console.log,
	info: console.info,
	warn: console.warn,
	error: console.error,
};

const savedWindowMethods: Record<string, any> = {
	fetch: window.fetch,
};

const savedWebRequestMethods: Record<string, any> = {
	open: WebRequest.prototype.open,
};

const savedEngineMethods: Record<string, any> = {
	createTexture: Engine.prototype.createTexture,
};

const savedObservableMethods: Record<string, any> = {
	add: Observable.prototype.add,
	addOnce: Observable.prototype.addOnce,
	remove: Observable.prototype.remove,
	clear: Observable.prototype.clear,
};

const savedHtmlElementMethods: Record<string, any> = {
	addEventListener: HTMLElement.prototype.addEventListener,
	removeEventListener: HTMLElement.prototype.removeEventListener,
};

const savedObservableListeners: {
	callback: any;
	observer: Observer<any>;
	observable: Observable<any>;
}[] = [];

const savedHtmlElementListeners: {
	element: HTMLElement;
	type: string;
	listener: EventListenerOrEventListenerObject;
}[] = [];

/**
 * To play scene inline in the editor, we need to override some methods.
 * This function restores all the orignal methods for all object that have been overridden.
 */
export function restorePlayOverrides(editor: Editor) {
	console.log = savedConsoleMethods.log;
	console.info = savedConsoleMethods.info;
	console.warn = savedConsoleMethods.warn;
	console.error = savedConsoleMethods.error;

	window.fetch = savedWindowMethods.fetch;

	WebRequest.prototype.open = savedWebRequestMethods.open;
	Engine.prototype.createTexture = savedEngineMethods.createTexture;

	Observable.prototype.add = savedObservableMethods.add;
	Observable.prototype.addOnce = savedObservableMethods.addOnce;
	Observable.prototype.remove = savedObservableMethods.remove;
	Observable.prototype.clear = savedObservableMethods.clear;

	savedObservableListeners.forEach((listener) => {
		listener.observable.remove(listener.observer);
	});
	savedObservableListeners.splice(0, savedObservableListeners.length);

	HTMLElement.prototype.addEventListener = savedHtmlElementMethods.addEventListener;
	HTMLElement.prototype.removeEventListener = savedHtmlElementMethods.removeEventListener;

	savedHtmlElementListeners.forEach((listener) => {
		listener.element.removeEventListener(listener.type, listener.listener);
	});
	savedHtmlElementListeners.splice(0, savedHtmlElementListeners.length);

	// Restore engine state
	const engine = editor.layout.preview.engine;

	if (engine.isPointerLock) {
		ExitPointerlock();
	}

	if (engine.isFullscreen) {
		ExitFullscreen();
	}

	engine.resize();
}

export function applyOverrides(editor: Editor) {
	// Console
	const consoleMethodsList = ["log", "warn", "error", "info"];
	consoleMethodsList.forEach((method) => {
		console[method] = (...args: any[]) => {
			const node = (
				<div>
					<b className="font-bold text-[#2d72d2]"> [DEBUG] </b>
					{args.join("\n")}
				</div>
			);

			switch (method) {
				case "log":
					editor.layout.console.log(node);
					break;
				case "warn":
					editor.layout.console.warn(node);
					break;
				case "error":
					editor.layout.console.error(node);
					break;
				case "info":
					editor.layout.console.log(node);
					break;
			}

			savedConsoleMethods[method].apply(window, args);
		};
	});

	const projectDir = dirname(editor.state.projectPath ?? "");
	const publicDir = join(projectDir, "public");
	const publicScene = join(publicDir, "scene");

	// Fetch
	window.fetch = async (input: string | URL | Request, init?: RequestInit) => {
		if (!isAbsolute(input.toString())) {
			input = join(publicDir, input.toString());
		}

		return savedWindowMethods.fetch.call(window, input, init);
	};

	// HTML Element
	HTMLElement.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, ...args: any[]) {
		if (!getCurrentCallStack().includes(projectDir)) {
			return savedHtmlElementMethods.addEventListener.call(this, type, listener, ...args);
		}

		savedHtmlElementListeners.push({
			type,
			listener,
			element: this,
		});

		return savedHtmlElementMethods.addEventListener.call(this, type, listener, ...args);
	};

	HTMLElement.prototype.removeEventListener = function (type: string, listener: EventListenerOrEventListenerObject, ...args: any[]) {
		const index = savedHtmlElementListeners.findIndex((config) => {
			return config.element === this && config.type === type && config.listener === listener;
		});

		if (index !== -1) {
			savedHtmlElementListeners.splice(index, 1);
		}

		return savedHtmlElementMethods.removeEventListener.call(this, type, listener, ...args);
	};

	// WebRequest
	WebRequest.prototype.open = function (method: string, url: string) {
		if (url && !isAbsolute(url)) {
			url = join(publicDir, url);
		}

		const temporaryTextureIndex = url?.indexOf(".bjseditor") ?? -1;
		if (temporaryTextureIndex !== -1) {
			url = join(publicDir, "..", url.substring(temporaryTextureIndex));
		}

		return savedWebRequestMethods.open.call(this, method, url);
	};

	// Engine
	Engine.prototype.createTexture = (url: string, ...args: any[]) => {
		const temporaryTextureIndex = url?.indexOf(".bjseditor") ?? -1;

		if (temporaryTextureIndex !== -1) {
			url = join(publicDir, "..", url.substring(temporaryTextureIndex));
		} else if (url?.includes(publicScene)) {
			url = url.replace(publicScene, projectDir);
		}

		return savedEngineMethods.createTexture.call(editor.layout.preview.engine, url, ...args);
	};

	// Observable
	Observable.prototype.add = function (callback: any, ...args: any[]) {
		if (!getCurrentCallStack().includes(projectDir)) {
			return savedObservableMethods.add.call(this, callback, ...args);
		}

		const observer = savedObservableMethods.add.call(this, callback, ...args);

		savedObservableListeners.push({
			observer,
			callback,
			observable: this,
		});

		return observer;
	};

	Observable.prototype.addOnce = function (callback: any, ...args: any[]) {
		if (!getCurrentCallStack().includes(projectDir)) {
			return savedObservableMethods.addOnce.call(this, callback, ...args);
		}

		const observer = savedObservableMethods.addOnce.call(this, callback, ...args);

		savedObservableListeners.push({
			observer,
			callback,
			observable: this,
		});

		return observer;
	};

	Observable.prototype.remove = function (callbackOrObserver: any, ...args: any[]) {
		const index = savedObservableListeners.findIndex((config) => {
			return config.observer === callbackOrObserver || config.callback === callbackOrObserver;
		});

		if (index !== -1) {
			savedObservableListeners.splice(index, 1);
		}

		return savedObservableMethods.remove.call(this, callbackOrObserver, ...args);
	};

	Observable.prototype.clear = function () {
		for (let i = 0; i < savedObservableListeners.length; ++i) {
			const config = savedObservableListeners[i];

			if (config.observable === this) {
				savedObservableMethods.remove.call(this, config.observer);
				savedObservableListeners.splice(i, 1);
				--i;
			}
		}
	};
}
