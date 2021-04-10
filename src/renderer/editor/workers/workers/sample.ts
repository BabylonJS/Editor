import "../../../module";

// Import some classes from babylonjs.
import { Engine } from "babylonjs";

import "babylonjs-materials";
import "babylonjs-loaders";

export default class PlayWorker {
	/**
	 * Constructor.
	 */
	public constructor(canvas: HTMLCanvasElement) {
		console.log("Able to transfer an offscreen canvas", canvas);
		console.log("Able to import classes from modules", Engine);
	}

	/**
	 * Defines a callable async function with some parameter.
	 */
	public async asyncFunction(param1: string, param2: number): Promise<void> {
		console.log(param1);
		console.log(param2);
	}
}
