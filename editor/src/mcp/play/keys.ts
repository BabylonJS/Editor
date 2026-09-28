export interface IKeyDescription {
	/**
	 * Defines the value of "KeyboardEvent.key", like "w", " " or "Shift".
	 */
	key: string;
	/**
	 * Defines the value of "KeyboardEvent.code", like "KeyW", "Space" or "ShiftLeft".
	 */
	code: string;
	/**
	 * Defines the value of the legacy "KeyboardEvent.keyCode", like 87 for W.
	 */
	keyCode: number;
}

const namedKeys: Record<string, IKeyDescription> = {
	space: { key: " ", code: "Space", keyCode: 32 },
	" ": { key: " ", code: "Space", keyCode: 32 },
	shift: { key: "Shift", code: "ShiftLeft", keyCode: 16 },
	control: { key: "Control", code: "ControlLeft", keyCode: 17 },
	ctrl: { key: "Control", code: "ControlLeft", keyCode: 17 },
	alt: { key: "Alt", code: "AltLeft", keyCode: 18 },
	enter: { key: "Enter", code: "Enter", keyCode: 13 },
	escape: { key: "Escape", code: "Escape", keyCode: 27 },
	tab: { key: "Tab", code: "Tab", keyCode: 9 },
	backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
	arrowleft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
	arrowup: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
	arrowright: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
	arrowdown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
};

/**
 * Returns the description of the given key, given as its "KeyboardEvent.key" value ("w", "W", " ", "Shift",
 * "ArrowUp") or its name ("Space", "Ctrl").
 * @param name defines the key.
 */
export function getKeyDescription(name: string): IKeyDescription {
	const named = namedKeys[name.toLowerCase()];
	if (named) {
		return named;
	}

	if (name.length === 1) {
		const upper = name.toUpperCase();

		if (/[A-Z]/.test(upper)) {
			return { key: name.toLowerCase(), code: `Key${upper}`, keyCode: upper.charCodeAt(0) };
		}

		if (/[0-9]/.test(upper)) {
			return { key: name, code: `Digit${upper}`, keyCode: upper.charCodeAt(0) };
		}

		return { key: name, code: "", keyCode: upper.charCodeAt(0) };
	}

	throw new Error(
		`Unknown key "${name}". Use a character ("w", "1"), or one of: Space, Shift, Control, Alt, Enter, Escape, Tab, Backspace, ArrowLeft, ArrowUp, ArrowRight, ArrowDown.`
	);
}

/**
 * Returns the value stored by the "@visibleAsKeyMap" decorator for the given key: the character code of the upper-cased
 * "KeyboardEvent.key" value, as the inspector of the editor stores it.
 * @param value defines the key: a number is kept as is, a string is a key ("w", "Space").
 */
export function getKeyMapValue(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		return getKeyDescription(value).key.toUpperCase().charCodeAt(0);
	}

	throw new Error(`Invalid key: ${JSON.stringify(value)}. Give a key like "w" or "Space", or a key code.`);
}
