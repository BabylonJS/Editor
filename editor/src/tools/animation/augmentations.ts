export { AnimationGroup } from "babylonjs";

declare module "babylonjs" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface AnimationGroup {
		doNotSerialize?: boolean;
	}
}
