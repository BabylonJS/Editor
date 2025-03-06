import { ReactNode } from "react";

import { Scene, AbstractMesh, Vector3 } from "babylonjs";

import { EditorInspectorNodeField } from "../../inspector/fields/node";
import { EditorInspectorVectorField } from "../../inspector/fields/vector";

import { ICinematicKeyEventData } from "../schema/event";

export class CinematicEventApplyImpulse implements ICinematicKeyEventData {
    public type: string = "apply-impulse";

    public scene: Scene;
    public force: Vector3;
    public contactPoint: Vector3;
    public mesh: AbstractMesh | null;

    public constructor(scene: Scene, force?: Vector3, contactPoint?: Vector3, meshId?: string) {
        this.scene = scene;
        this.force = force ?? Vector3.Zero();
        this.contactPoint = contactPoint ?? Vector3.Zero();
        this.mesh = meshId ? scene.getMeshById(meshId) : null;
    }

    public serialize(): any {
        return {
            type: this.type,
            force: this.force.asArray(),
            contactPoint: this.contactPoint.asArray(),
            mesh: this.mesh?.id,
        };
    }

    public getInspector(): ReactNode {
        return (
            <>
                <EditorInspectorVectorField object={this} property="force" label="Force" />
                <EditorInspectorVectorField object={this} property="contactPoint" label="Contact Point" />
                <EditorInspectorNodeField object={this} property="mesh" scene={this.scene} label="Mesh" />
            </>
        );
    }

    public static parse(scene: Scene, config: any): CinematicEventApplyImpulse {
        return new CinematicEventApplyImpulse(
            scene,
            config.force ? Vector3.FromArray(config.force) : undefined,
            config.contactPoint ? Vector3.FromArray(config.contactPoint) : undefined,
            config.mesh,
        );
    }
}
