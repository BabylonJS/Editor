import { Observable, type Mesh, type Nullable, type Observer, type Scene } from "babylonjs";

import type { ITerrainBusyInfo } from "./types";

/** Minimum delay between two progress notifications of the same busy state (§3.5 onBusyChangedObservable). */
export const TERRAIN_BUSY_PROGRESS_INTERVAL_MS = 100;

/** Maximum duration of one slice of a long operation or of a headless stroke before it yields (§7.4). */
export const TERRAIN_SLICE_BUDGET_MS = 16;

/** Safety delay after which a frame yield resolves even when requestAnimationFrame did not fire (occluded windows). */
const FRAME_YIELD_FALLBACK_MS = 250;

/**
 * Thrown (or used as a rejection reason) by terrain operations whose busy scope was aborted because the scene (or the mesh)
 * was disposed: the operation restored its start state and registered no undo entry (§7.3).
 */
export class TerrainOperationAbortedError extends Error {
	public constructor(label: string) {
		super(`${label} was aborted: the scene was disposed.`);
		this.name = "TerrainOperationAbortedError";
	}
}

/**
 * Busy state of one asynchronous terrain mutation (global operation, creation, resize, import, headless stroke).
 * While at least one scope is open: the engine is busy (strokes refused with "busy", operations throw
 * TerrainRefusedError), the terrain undo entries refuse to apply (history.ts) and whenTerrainIdleAsync() waits (§7.3).
 * An external scope (ITerrainBusyScopeOptions.external) is ignored by the engine calls made inside it (isTerrainEngineBusy).
 */
export interface ITerrainBusyScope {
	readonly label: string;
	readonly mesh: Mesh | null;
	/** true for a scope opened by a caller outside the engine around its engine calls (see ITerrainBusyScopeOptions.external). */
	readonly external: boolean;
	/** Last progress, 0..1. */
	readonly progress: number;
	/** false once disposed. */
	readonly isOpen: boolean;
	/** true once the scene of the mesh (or the mesh itself) was disposed: the operation must restore its start state and stop. */
	readonly aborted: boolean;
	/** Notified once when the scope is aborted. */
	readonly onAbortObservable: Observable<ITerrainBusyScope>;
	/** Sets the progress (0..1, clamped); observers are notified at most every 100 ms (always at 0 and 1). */
	setProgress(progress: number): void;
	/** Throws a TerrainOperationAbortedError when the scope was aborted (call between slices). */
	throwIfAborted(): void;
	/** Releases the busy state. Idempotent: call it in `finally`. */
	dispose(): void;
}

/** Options of createTerrainBusyScope. */
export interface ITerrainBusyScopeOptions {
	/**
	 * true for a scope opened by a caller outside the engine around several engine calls (an MCP mutation, "Agent editing"). Like every scope
	 * it makes isTerrainBusy, getTerrainBusyInfo and whenTerrainIdleAsync busy (the Terrain tab shows it and refuses its own edits, UI
	 * strokes are refused "busy"), but the engine calls made inside it ignore it (isTerrainEngineBusy,
	 * whenTerrainEngineIdleAsync) and, while it is open, are not refused "saving": a save that started meanwhile doesn't wait for the
	 * scope, what the mutation changes afterwards is written by the next save (§7.3). Default false.
	 */
	external?: boolean;
}

/** Notified when a busy scope opens, progresses (at most every 100 ms) or closes (null when the last one closed). */
export const onTerrainBusyChangedObservable: Observable<Readonly<ITerrainBusyInfo> | null> = new Observable<Readonly<ITerrainBusyInfo> | null>();

const openScopes: TerrainBusyScope[] = [];
let idleResolvers: (() => void)[] = [];
let engineIdleResolvers: (() => void)[] = [];

class TerrainBusyScope implements ITerrainBusyScope {
	public readonly onAbortObservable: Observable<ITerrainBusyScope> = new Observable<ITerrainBusyScope>();

	private _progress: number = 0;
	private _open: boolean = true;
	private _aborted: boolean = false;
	private _lastNotificationTime: number = -Infinity;

	private _scene: Scene | null = null;
	private _sceneObserver: Nullable<Observer<Scene>> = null;
	private _meshObserver: Nullable<Observer<any>> = null;

	public readonly info: ITerrainBusyInfo;

	public constructor(
		public readonly label: string,
		public readonly mesh: Mesh | null,
		public readonly external: boolean
	) {
		this.info = { label, progress: 0, meshId: mesh?.id ?? null };

		if (mesh) {
			try {
				this._scene = mesh.getScene();
				this._sceneObserver = this._scene?.onDisposeObservable.add(() => this._abort()) ?? null;
				this._meshObserver = mesh.onDisposeObservable.add(() => this._abort());
			} catch (e) {
				reportBusyScopeError(e);
			}
		}
	}

	public get progress(): number {
		return this._progress;
	}

	public get isOpen(): boolean {
		return this._open;
	}

	public get aborted(): boolean {
		return this._aborted;
	}

	public setProgress(progress: number): void {
		if (!this._open) {
			return;
		}

		const value = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
		if (value === this._progress) {
			return;
		}

		this._progress = value;
		this.info.progress = value;

		const now = getNow();
		if (value === 1 || now - this._lastNotificationTime >= TERRAIN_BUSY_PROGRESS_INTERVAL_MS) {
			this._lastNotificationTime = now;
			if (openScopes[openScopes.length - 1] === this) {
				notifyBusyChanged();
			}
		}
	}

	public throwIfAborted(): void {
		if (this._aborted) {
			throw new TerrainOperationAbortedError(this.label);
		}
	}

	public dispose(): void {
		if (!this._open) {
			return;
		}

		this._open = false;
		this._removeObservers();

		const index = openScopes.indexOf(this);
		if (index !== -1) {
			openScopes.splice(index, 1);
		}

		notifyBusyChanged();

		if (!isTerrainEngineBusy()) {
			const resolvers = engineIdleResolvers;
			engineIdleResolvers = [];
			resolvers.forEach((resolve) => resolve());
		}

		if (openScopes.length === 0) {
			const resolvers = idleResolvers;
			idleResolvers = [];
			resolvers.forEach((resolve) => resolve());
		}
	}

	public markNotified(): void {
		this._lastNotificationTime = getNow();
	}

	private _abort(): void {
		if (this._aborted || !this._open) {
			return;
		}

		this._aborted = true;
		this._removeObservers();

		try {
			this.onAbortObservable.notifyObservers(this);
		} catch (e) {
			reportBusyScopeError(e);
		}
	}

	private _removeObservers(): void {
		try {
			if (this._sceneObserver) {
				this._scene?.onDisposeObservable.remove(this._sceneObserver);
			}

			if (this._meshObserver) {
				this.mesh?.onDisposeObservable.remove(this._meshObserver);
			}
		} catch (e) {
			reportBusyScopeError(e);
		}

		this._sceneObserver = null;
		this._meshObserver = null;
	}
}

/**
 * Opens a busy scope (§7.3): sets the busy info and notifies onTerrainBusyChangedObservable (scopes can nest) and aborts when the scene
 * of `mesh` (or `mesh`) is disposed.
 * Always release it in `finally` with `scope.dispose()`.
 * @param label defines the label of the operation shown by the UI (e.g. "Eroding", "Generating", "Resampling", "Converting").
 * @param mesh defines the terrain the operation works on (null when none).
 * @param options defines whether the scope is external (opened around engine calls by a caller outside the engine, see ITerrainBusyScopeOptions).
 */
export function createTerrainBusyScope(label: string, mesh: Mesh | null, options: ITerrainBusyScopeOptions = {}): ITerrainBusyScope {
	const scope = new TerrainBusyScope(label, mesh, options.external === true);

	openScopes.push(scope);

	scope.markNotified();
	notifyBusyChanged();

	return scope;
}

/**
 * Returns whether or not at least one terrain busy scope is open (external scopes included).
 */
export function isTerrainBusy(): boolean {
	return openScopes.length > 0;
}

/**
 * Returns whether or not a busy scope opened by the engine is open: external scopes and `ignored` don't count. The engine checks its own
 * "busy" refusals and exclusive waits with it, so the engine calls made inside an external scope are not refused (nor blocked) by it.
 * @param ignored defines a scope that doesn't count either (the scope of the caller itself).
 */
export function isTerrainEngineBusy(ignored?: ITerrainBusyScope | null): boolean {
	return openScopes.some((scope) => !scope.external && scope !== ignored);
}

/**
 * Returns whether or not an external busy scope is open (ITerrainBusyScopeOptions.external: an MCP mutation runs its engine calls).
 */
export function hasExternalTerrainBusyScope(): boolean {
	return openScopes.some((scope) => scope.external);
}

/**
 * Returns the busy info of the most recently opened scope that is still open, null when idle.
 */
export function getTerrainBusyInfo(): Readonly<ITerrainBusyInfo> | null {
	return openScopes[openScopes.length - 1]?.info ?? null;
}

/**
 * Returns the busy scopes currently open (outermost first).
 */
export function getTerrainBusyScopes(): readonly ITerrainBusyScope[] {
	return openScopes;
}

/**
 * Resolves when no busy scope is open, external scopes included (immediately when idle). A new scope may open right after the promise
 * resolves: callers that need exclusivity check isTerrainBusy() again synchronously before starting their own scope.
 */
export function whenTerrainIdleAsync(): Promise<void> {
	if (openScopes.length === 0) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve) => {
		idleResolvers.push(resolve);
	});
}

/**
 * Resolves when no busy scope opened by the engine is open: external scopes don't count (immediately when none is open). The engine waits
 * with it, so an engine call made inside an external scope never waits for that scope (deadlock). Callers that need exclusivity check
 * isTerrainEngineBusy() again synchronously before starting their own scope.
 */
export function whenTerrainEngineIdleAsync(): Promise<void> {
	if (!isTerrainEngineBusy()) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve) => {
		engineIdleResolvers.push(resolve);
	});
}

/**
 * Yields to the browser between two slices of a long terrain operation or headless stroke (§7.4):
 * requestAnimationFrame when the document is visible, a MessageChannel round trip otherwise (not throttled while the window
 * is minimized or occluded). Nothing waits for the render loop: a frame yield also resolves when the document becomes hidden
 * or after a short safety delay.
 */
export function yieldTerrainWork(): Promise<void> {
	return new Promise<void>((resolve) => {
		const doc = typeof document !== "undefined" ? document : null;
		const visible = doc?.visibilityState === "visible";

		if (!visible || typeof requestAnimationFrame !== "function") {
			postTerrainMessage(resolve);
			return;
		}

		let done = false;
		let frameId: number | null = null;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		function onVisibilityChange(): void {
			if (doc?.visibilityState !== "visible") {
				postTerrainMessage(finish);
			}
		}

		function finish(): void {
			if (done) {
				return;
			}

			done = true;

			try {
				doc?.removeEventListener("visibilitychange", onVisibilityChange);
				if (timeoutId !== null) {
					clearTimeout(timeoutId);
				}
				if (frameId !== null && typeof cancelAnimationFrame === "function") {
					cancelAnimationFrame(frameId);
				}
			} catch (e) {
				reportBusyScopeError(e);
			}

			resolve();
		}

		doc?.addEventListener("visibilitychange", onVisibilityChange);
		timeoutId = setTimeout(finish, FRAME_YIELD_FALLBACK_MS);
		frameId = requestAnimationFrame(() => {
			frameId = null;
			finish();
		});
	});
}

/**
 * Measures the duration of the current slice of a long operation and yields (yieldTerrainWork) once it exceeds the budget (§7.4).
 */
export class TerrainWorkSlicer {
	private _sliceStart: number;

	/**
	 * @param budgetMs defines the maximum duration of a slice (default 16 ms).
	 * @param clock defines the clock (default performance.now).
	 */
	public constructor(
		public readonly budgetMs: number = TERRAIN_SLICE_BUDGET_MS,
		private readonly _clock: () => number = getNow
	) {
		this._sliceStart = this._clock();
	}

	/** Milliseconds spent in the current slice. */
	public get elapsedMs(): number {
		return this._clock() - this._sliceStart;
	}

	/** true when the current slice exceeded the budget. */
	public get shouldYield(): boolean {
		return this.elapsedMs >= this.budgetMs;
	}

	/** Remaining milliseconds of the current slice (never negative). */
	public get remainingMs(): number {
		return Math.max(0, this.budgetMs - this.elapsedMs);
	}

	/** Yields now and starts a new slice. */
	public async yield(): Promise<void> {
		await yieldTerrainWork();
		this._sliceStart = this._clock();
	}

	/** Yields only when the current slice exceeded the budget; returns true when it yielded. */
	public async maybeYield(): Promise<boolean> {
		if (!this.shouldYield) {
			return false;
		}

		await this.yield();
		return true;
	}
}

function notifyBusyChanged(): void {
	try {
		onTerrainBusyChangedObservable.notifyObservers(getTerrainBusyInfo());
	} catch (e) {
		reportBusyScopeError(e);
	}
}

function postTerrainMessage(callback: () => void): void {
	if (typeof MessageChannel !== "function") {
		setTimeout(callback, 0);
		return;
	}

	const channel = new MessageChannel();
	channel.port1.onmessage = () => {
		channel.port1.onmessage = null;
		channel.port1.close();
		channel.port2.close();
		callback();
	};
	channel.port2.postMessage(0);
}

function getNow(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function reportBusyScopeError(error: unknown): void {
	console.error(`[Terrain] ${error instanceof Error ? error.message : String(error)}`);
}
