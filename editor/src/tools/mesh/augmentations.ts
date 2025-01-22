import { PhysicsAggregate } from "babylonjs";

export { AbstractMesh } from "babylonjs";

declare module "babylonjs" {
    export interface AbstractMesh {
        physicsAggregate?: PhysicsAggregate | null;
    }
}
