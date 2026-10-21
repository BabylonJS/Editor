import { createPickingRay, getEffectiveAspectRatio, getViewProjectionMatrix, Mesh, PickingInfo, pickWithRay, SceneContext } from "@babylonjs/lite";

import { isNodeEnabled } from "./node";

/**
 * Defines the types of pointer events, same values as Babylon.js `PointerEventTypes`.
 */
export const PointerEventTypes = {
	POINTERDOWN: 0x01,
	POINTERUP: 0x02,
	POINTERMOVE: 0x04,
	POINTERWHEEL: 0x08,
	POINTERPICK: 0x10,
	POINTERTAP: 0x20,
	POINTERDOUBLETAP: 0x40,
} as const;

/**
 * Defines the types of keyboard events, same values as Babylon.js `KeyboardEventTypes`.
 */
export const KeyboardEventTypes = {
	KEYDOWN: 0x01,
	KEYUP: 0x02,
} as const;

/**
 * Defines the informations of a pointer event raised on the canvas of a scene.
 */
export interface IPointerInfo {
	/**
	 * Defines the type of the pointer event.
	 * @see PointerEventTypes
	 */
	readonly type: number;
	/**
	 * Defines the reference to the original DOM event.
	 */
	readonly event: PointerEvent | WheelEvent | MouseEvent;
	/**
	 * Defines the picking information of the pointer event, computed on demand the first time it is accessed.
	 */
	readonly pickInfo: PickingInfo | null;
}

/**
 * Defines the informations of a keyboard event raised on the canvas of a scene.
 */
export interface IKeyboardInfo {
	/**
	 * Defines the type of the keyboard event.
	 * @see KeyboardEventTypes
	 */
	readonly type: number;
	/**
	 * Defines the reference to the original DOM event.
	 */
	readonly event: KeyboardEvent;
}

/**
 * Defines the default predicate used to pick meshes on pointer events: visible, pickable and enabled meshes.
 */
export function defaultPointerPickPredicate(mesh: Mesh): boolean {
	return mesh.visible !== false && mesh.pickable !== false && isNodeEnabled(mesh, true);
}

/**
 * Picks the scene at the given coordinates, expressed in CSS pixels relative to the canvas of the scene.
 * @param scene defines the reference to the scene to pick.
 * @param x defines the X coordinate in CSS pixels relative to the canvas.
 * @param y defines the Y coordinate in CSS pixels relative to the canvas.
 * @param predicate defines the optional predicate used to filter the meshes that can be picked.
 * @returns the picking information or null if the scene has no active camera.
 */
export function pickScene(scene: SceneContext, x: number, y: number, predicate?: (mesh: Mesh) => boolean): PickingInfo | null {
	const camera = scene.camera;
	const canvas = scene.surface.canvas as HTMLCanvasElement;

	if (!camera) {
		return null;
	}

	const width = canvas.clientWidth ?? canvas.width;
	const height = canvas.clientHeight ?? canvas.height;

	const viewProjection = getViewProjectionMatrix(camera, getEffectiveAspectRatio(camera, canvas.width, canvas.height));
	const ray = createPickingRay(x, y, viewProjection, width, height);
	if (!ray) {
		return null;
	}

	return pickWithRay(scene, ray, {
		predicate: predicate ?? defaultPointerPickPredicate,
	});
}

/**
 * @internal
 */
export interface _ISceneInputsState {
	pointerX: number;
	pointerY: number;
	dispose: () => void;
}

/**
 * @internal
 * Listens the pointer and keyboard events of the canvas of the given scene and notifies the given callbacks.
 */
export function _attachSceneInputs(scene: SceneContext, onPointer: (info: IPointerInfo) => void, onKeyboard: (info: IKeyboardInfo) => void): _ISceneInputsState {
	const canvas = scene.surface.canvas as HTMLCanvasElement;

	const state: _ISceneInputsState = {
		pointerX: 0,
		pointerY: 0,
		dispose: () => {},
	};

	if (typeof canvas?.addEventListener !== "function") {
		return state;
	}

	let downTime = 0;
	let downX = 0;
	let downY = 0;

	function notifyPointer(type: number, event: PointerEvent | WheelEvent | MouseEvent) {
		let pickInfo: PickingInfo | null | undefined = undefined;

		onPointer({
			type,
			event,
			get pickInfo() {
				if (pickInfo === undefined) {
					pickInfo = pickScene(scene, state.pointerX, state.pointerY);
				}
				return pickInfo;
			},
		});
	}

	function updatePointerPosition(event: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		state.pointerX = event.clientX - rect.left;
		state.pointerY = event.clientY - rect.top;
	}

	const onPointerDown = (event: PointerEvent) => {
		updatePointerPosition(event);

		downTime = performance.now();
		downX = state.pointerX;
		downY = state.pointerY;

		notifyPointer(PointerEventTypes.POINTERDOWN, event);
	};

	const onPointerUp = (event: PointerEvent) => {
		updatePointerPosition(event);
		notifyPointer(PointerEventTypes.POINTERUP, event);

		// Same thresholds as Babylon.js InputManager.DragMovementThreshold and InputManager.LongPressDelay.
		const moved = Math.abs(downX - state.pointerX) > 10 || Math.abs(downY - state.pointerY) > 10;
		if (!moved && performance.now() - downTime < 500) {
			notifyPointer(PointerEventTypes.POINTERTAP, event);
		}
	};

	const onPointerMove = (event: PointerEvent) => {
		updatePointerPosition(event);
		notifyPointer(PointerEventTypes.POINTERMOVE, event);
	};

	const onWheel = (event: WheelEvent) => {
		updatePointerPosition(event);
		notifyPointer(PointerEventTypes.POINTERWHEEL, event);
	};

	const onDoubleClick = (event: MouseEvent) => {
		updatePointerPosition(event);
		notifyPointer(PointerEventTypes.POINTERDOUBLETAP, event);
	};

	const onKeyDown = (event: KeyboardEvent) => onKeyboard({ type: KeyboardEventTypes.KEYDOWN, event });
	const onKeyUp = (event: KeyboardEvent) => onKeyboard({ type: KeyboardEventTypes.KEYUP, event });

	canvas.addEventListener("pointerdown", onPointerDown);
	canvas.addEventListener("pointerup", onPointerUp);
	canvas.addEventListener("pointermove", onPointerMove);
	canvas.addEventListener("wheel", onWheel, { passive: true });
	canvas.addEventListener("dblclick", onDoubleClick);
	canvas.addEventListener("keydown", onKeyDown);
	canvas.addEventListener("keyup", onKeyUp);

	state.dispose = () => {
		canvas.removeEventListener("pointerdown", onPointerDown);
		canvas.removeEventListener("pointerup", onPointerUp);
		canvas.removeEventListener("pointermove", onPointerMove);
		canvas.removeEventListener("wheel", onWheel);
		canvas.removeEventListener("dblclick", onDoubleClick);
		canvas.removeEventListener("keydown", onKeyDown);
		canvas.removeEventListener("keyup", onKeyUp);
	};

	return state;
}
