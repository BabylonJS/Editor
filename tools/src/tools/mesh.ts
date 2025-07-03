import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";

declare module "@babylonjs/core/Meshes/abstractMesh" {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    export interface AbstractMesh {
        physicsAggregate?: PhysicsAggregate | null;
    }
}
