import { FreeCamera, ICameraInput, Scene, Vector3 } from "babylonjs";

/**
 * FreeCamera input to pan the camera using Alt + Left Mouse Button.
 */
export class EditorFreeCameraPanInput implements ICameraInput<FreeCamera> {
	public camera: FreeCamera;

	private _scene: Scene;
	private _canvas: HTMLCanvasElement | null = null;

	private _isPanning: boolean = false;
	private _lastClientX: number = 0;
	private _lastClientY: number = 0;

	private _detachedMouseInput: any | null = null;

	public panSensitivityMultiplier: number = 10;
	private static readonly _panMinDistance: number = 2;
	private static readonly _panMaxDistance: number = 200;
	private static readonly _panMaxPixelDelta: number = 40;
	private static readonly _defaultFov: number = Math.PI / 4;

	private _pointerDownListener: ((ev: PointerEvent) => void) | null = null;
	private _pointerMoveListener: ((ev: PointerEvent) => void) | null = null;
	private _pointerUpListener: ((ev: PointerEvent) => void) | null = null;
	private _pointerCancelListener: ((ev: PointerEvent) => void) | null = null;

	public getClassName(): string {
		return "EditorFreeCameraPanInput";
	}

	public getSimpleName(): string {
		return "editorPan";
	}

	public attachControl(noPreventDefaultOrElement?: any, maybeNoPreventDefault?: boolean): void {
		let noPreventDefault = false;
		if (typeof noPreventDefaultOrElement === "boolean") {
			noPreventDefault = noPreventDefaultOrElement;
		} else if (typeof maybeNoPreventDefault === "boolean") {
			noPreventDefault = maybeNoPreventDefault;
		}

		this._scene = this.camera.getScene();
		this._canvas = this._scene.getEngine().getRenderingCanvas();
		if (!this._canvas) {
			console.warn("EditorFreeCameraPanInput: No canvas found");
			return;
		}

		document.addEventListener(
			"pointerdown",
			(this._pointerDownListener = (ev: PointerEvent) => {
				// Only handle events on our canvas
				if (ev.target !== this._canvas) {
					return;
				}

				const isAltLeft = ev.button === 0 && ev.altKey;
				const isMMB = ev.button === 1; // allow middle mouse to pan as well
				if (!isAltLeft && !isMMB) {
					return;
				}

				this._beginPan(ev);
				if (!noPreventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}
			}),
			true
		);

		document.addEventListener(
			"pointermove",
			(this._pointerMoveListener = (ev: PointerEvent) => {
				if (!this._isPanning) {
					return;
				}

				if (!noPreventDefault) {
					ev.preventDefault();
					ev.stopPropagation();
				}

				this._updatePan(ev);
			}),
			true
		);

		const endPan = (ev: PointerEvent) => {
			if (!this._isPanning) {
				return;
			}
			if (!noPreventDefault) {
				ev.preventDefault();
				ev.stopPropagation();
			}
			this._endPan(ev);
		};

		document.addEventListener("pointerup", (this._pointerUpListener = endPan), true);
		document.addEventListener("pointercancel", (this._pointerCancelListener = endPan), true);
	}

	public detachControl(): void {
		if (this._isPanning) {
			this._endPan();
		}

		if (this._pointerDownListener) {
			document.removeEventListener("pointerdown", this._pointerDownListener, true);
			this._pointerDownListener = null;
		}
		if (this._pointerMoveListener) {
			document.removeEventListener("pointermove", this._pointerMoveListener, true);
			this._pointerMoveListener = null;
		}
		if (this._pointerUpListener) {
			document.removeEventListener("pointerup", this._pointerUpListener, true);
			this._pointerUpListener = null;
		}
		if (this._pointerCancelListener) {
			document.removeEventListener("pointercancel", this._pointerCancelListener, true);
			this._pointerCancelListener = null;
		}

		this._canvas = null;
	}

	public checkInputs(): void {
		// no-op
	}

	private _beginPan(ev: PointerEvent): void {
		this._isPanning = true;
		this._lastClientX = ev.clientX;
		this._lastClientY = ev.clientY;

		try {
			(ev.target as any)?.setPointerCapture?.(ev.pointerId);
		} catch {}

		// Detach default mouse rotation input while panning
		const attached: any = (this.camera.inputs as any).attached;
		this._detachedMouseInput = attached?.mouse ?? attached?.pointers ?? null;
		try {
			this._detachedMouseInput?.detachControl?.();
		} catch {}

		try {
			document.body.style.cursor = "grabbing";
		} catch {}
	}

	private _updatePan(ev: PointerEvent): void {
		const cam = this.camera as any;
		let deltaX = ev.clientX - this._lastClientX;
		let deltaY = ev.clientY - this._lastClientY;
		if (deltaX === 0 && deltaY === 0) {
			return;
		}

		// Clamp pixel deltas to avoid large single-step jumps on missed frames
		const maxPix = EditorFreeCameraPanInput._panMaxPixelDelta;
		if (deltaX > maxPix) {
			deltaX = maxPix;
		} else if (deltaX < -maxPix) {
			deltaX = -maxPix;
		}
		if (deltaY > maxPix) {
			deltaY = maxPix;
		} else if (deltaY < -maxPix) {
			deltaY = -maxPix;
		}

		const engine = this._scene.getEngine();
		const renderHeight = engine.getRenderHeight(true);
		const fov = cam.fov ?? EditorFreeCameraPanInput._defaultFov;

		// Estimate distance to scene for scaling
		let distance = 10;
		try {
			const camPos = cam.globalPosition ?? cam.position;
			const pick = this._scene.pick(this._scene.pointerX, this._scene.pointerY, undefined, false);
			if (pick?.pickedPoint) {
				distance = Vector3.Distance(camPos, pick.pickedPoint);
			}
		} catch {}

		const clampedDistance = Math.min(Math.max(distance, EditorFreeCameraPanInput._panMinDistance), EditorFreeCameraPanInput._panMaxDistance);
		const worldPerPixelBase = (2 * Math.tan(fov / 2) * Math.max(clampedDistance, 0.0001)) / Math.max(renderHeight, 1);
		const worldPerPixel = worldPerPixelBase * this.panSensitivityMultiplier;

		const right = this.camera.getDirection(Vector3.Right());
		const up = this.camera.getDirection(Vector3.Up());
		const offset = right.scale(-deltaX * worldPerPixel).add(up.scale(deltaY * worldPerPixel));

		this.camera.position.addInPlace(offset);
		if (cam.target && cam.target.addInPlace) {
			try {
				cam.target.addInPlace(offset);
				cam.setTarget?.(cam.target);
			} catch {}
		}

		this._lastClientX = ev.clientX;
		this._lastClientY = ev.clientY;
	}

	private _endPan(ev?: PointerEvent): void {
		this._isPanning = false;

		// Re-attach default mouse input if we detached it
		try {
			this._detachedMouseInput?.attachControl?.();
		} catch {}
		this._detachedMouseInput = null;

		try {
			if (ev) {
				(ev.target as any)?.releasePointerCapture?.(ev.pointerId);
			}
		} catch {}

		try {
			document.body.style.cursor = "default";
		} catch {}
	}
}
