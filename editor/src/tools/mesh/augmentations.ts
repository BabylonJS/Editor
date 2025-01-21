import { PhysicsAggregate } from "babylonjs";

export { Mesh } from "babylonjs";

declare module "babylonjs" {
    export interface Mesh {
        physicsAggregate?: PhysicsAggregate;
    }
}
