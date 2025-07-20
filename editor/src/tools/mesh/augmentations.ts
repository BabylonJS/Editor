import { PhysicsAggregate } from "babylonjs";

export { AbstractMesh } from "babylonjs";

declare module "babylonjs" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface AbstractMesh {
		physicsAggregate?: PhysicsAggregate | null;
	}
}
