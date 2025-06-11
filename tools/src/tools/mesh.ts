import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";

declare module "@babylonjs/core/Meshes/abstractMesh" {
    export interface AbstractMesh {
        physicsAggregate?: PhysicsAggregate | null;
    }
}
