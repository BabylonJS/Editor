import { Node, FreeCamera, Scene, Vector3 } from "babylonjs";
import { EditorFreeCameraPanInput } from "./camera-pan-input";

import { isDomTextInputFocused } from "../../tools/dom";

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
			this.keysUp = keys.keysUp;
			this.keysDown = keys.keysDown;
			this.keysLeft = keys.keysLeft;
			this.keysRight = keys.keysRight;
			this.keysUpward = keys.keysUpward;
			this.keysDownward = keys.keysDownward;

			// Load pan sensitivity multiplier if available
			if (keys.panSensitivityMultiplier !== undefined) {
				this.panSensitivityMultiplier = keys.panSensitivityMultiplier;
			}
		} catch (e) {
			// Catch silently.
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
}

Node.AddNodeConstructor("EditorCamera", (name, scene) => {
	return () => new EditorCamera(name, Vector3.Zero(), scene);
});
