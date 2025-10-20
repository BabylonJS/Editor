import { Color4 } from "babylonjs";

export { Sprite } from "babylonjs";

declare module "babylonjs" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface Sprite {
		metadata?: any;
		overrideColor?: Color4;
	}
}
