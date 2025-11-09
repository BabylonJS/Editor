import { Node, FreeCamera, Scene, Vector3 } from "babylonjs";
import { EditorFreeCameraPanInput } from "./camera-pan-input";

import { isDomTextInputFocused } from "../../tools/dom";

const DEFAULT_KEYS = {
	keysUp: [87], // W - Forward
	keysDown: [83], // S - Backward
	keysLeft: [65], // A - Left
	keysRight: [68], // D - Right
	keysUpward: [69], // E - Up
	keysDownward: [81], // Q - Down
};

export class EditorCamera extends FreeCamera {
	private _savedSpeed: number | null = null;
	private _panInput: EditorFreeCameraPanInput;

	private _keyboardUpListener: (ev: KeyboardEvent) => void;
	private _keyboardDownListener: (ev: KeyboardEvent) => void;

	/**
	 * Constructor.
	 * @param name defines the name of the camera.
	 * @param position defines the start position of the camera.
	 * @param scene defines the reference to the scene where to add the camera.
	 * @param setActiveOnSceneIfNoneActive defines wether or not camera should be set as active
	 */
	public constructor(name: string, position: Vector3, scene: Scene, setActiveOnSceneIfNoneActive?: boolean) {
		super(name, position, scene, setActiveOnSceneIfNoneActive);

		this._setDefaultKeys();

		this.inputs.addMouseWheel();
		this._panInput = new EditorFreeCameraPanInput();

		window.addEventListener(
			"keydown",
			(this._keyboardDownListener = (ev) => {
				if (ev.key !== "Shift" || isDomTextInputFocused()) {
					return;
				}

				if (this._savedSpeed === null) {
					this._savedSpeed = this.speed;
					this.speed *= 0.1;
				}
			})
		);

		window.addEventListener(
			"keyup",
			(this._keyboardUpListener = (ev) => {
				if (ev.key !== "Shift") {
					return;
				}

				if (this._savedSpeed !== null) {
					this.speed = this._savedSpeed;
					this._savedSpeed = null;
				}
			})
		);
	}

	/**
	 * Override attachControl to ensure pan input is attached
	 */
	public attachControl(noPreventDefault?: boolean): void {
		super.attachControl(noPreventDefault);

		// Add pan input after camera is attached
		if (this._panInput && !this.inputs.attached.editorPan) {
			this.inputs.add(this._panInput);
		}
	}

	/**
	 * Some preferences for the editor's camera are saved in the local storage in order
	 * to be global for each project. This function tries to get the preferences from the local storage
	 * and applies it to the camera.
	 */
	public configureFromPreferences(): void {
		try {
			const keys = JSON.parse(localStorage.getItem("editor-camera-controls") as string);
			if (keys && keys.keysUp && keys.keysDown && keys.keysLeft && keys.keysRight && keys.keysUpward && keys.keysDownward) {
				this.keysUp = keys.keysUp;
				this.keysDown = keys.keysDown;
				this.keysLeft = keys.keysLeft;
				this.keysRight = keys.keysRight;
				this.keysUpward = keys.keysUpward;
				this.keysDownward = keys.keysDownward;
			} else {
				this._setDefaultKeysFromLayout();
			}

			// Load pan sensitivity multiplier if available
			if (keys && keys.panSensitivityMultiplier !== undefined) {
				this.panSensitivityMultiplier = keys.panSensitivityMultiplier;
			}
		} catch (e) {
			// If no preferences found or error occurred, use defaults
			this._setDefaultKeysFromLayout();
		}
	}

	/**
	 * Destroy the camera and release the current resources hold by it.
	 */
	public dispose(): void {
		super.dispose();

		window.removeEventListener("keyup", this._keyboardUpListener);
		window.removeEventListener("keydown", this._keyboardDownListener);
	}

	/**
	 * Gets the current object class name.
	 * @return the class name
	 */
	public getClassName(): string {
		return "EditorCamera";
	}

	/**
	 * Gets the pan sensitivity multiplier for the camera pan input.
	 * @returns the current pan sensitivity multiplier value.
	 */
	public get panSensitivityMultiplier(): number {
		return this._panInput.panSensitivityMultiplier;
	}

	/**
	 * Sets the pan sensitivity multiplier for the camera pan input.
	 * @param value defines the new pan sensitivity multiplier value.
	 */
	public set panSensitivityMultiplier(value: number) {
		this._panInput.panSensitivityMultiplier = value;
	}

	private _setDefaultKeys(): void {
		this.keysUp = DEFAULT_KEYS.keysUp;
		this.keysDown = DEFAULT_KEYS.keysDown;
		this.keysLeft = DEFAULT_KEYS.keysLeft;
		this.keysRight = DEFAULT_KEYS.keysRight;
		this.keysUpward = DEFAULT_KEYS.keysUpward;
		this.keysDownward = DEFAULT_KEYS.keysDownward;
	}

	private _setDefaultKeysFromLayout(): void {
		this._setDefaultKeys();

		navigator.keyboard?.getLayoutMap().then((layout) => {
			const keyUp = layout.get("KeyW")?.toUpperCase().charCodeAt(0);
			if (keyUp) {
				this.keysUp = [keyUp];
			}

			const keyDown = layout.get("KeyS")?.toUpperCase().charCodeAt(0);
			if (keyDown) {
				this.keysDown = [keyDown];
			}

			const keyLeft = layout.get("KeyA")?.toUpperCase().charCodeAt(0);
			if (keyLeft) {
				this.keysLeft = [keyLeft];
			}

			const keyRight = layout.get("KeyD")?.toUpperCase().charCodeAt(0);
			if (keyRight) {
				this.keysRight = [keyRight];
			}

			const keyUpward = layout.get("KeyE")?.toUpperCase().charCodeAt(0);
			if (keyUpward) {
				this.keysUpward = [keyUpward];
			}

			const keyDownward = layout.get("KeyQ")?.toUpperCase().charCodeAt(0);
			if (keyDownward) {
				this.keysDownward = [keyDownward];
			}
		});
	}
}

Node.AddNodeConstructor("EditorCamera", (name, scene) => {
	return () => new EditorCamera(name, Vector3.Zero(), scene);
});
