import { ReactNode } from "react";

import { Scene, AbstractMesh, Vector3 } from "babylonjs";

import { EditorInspectorNodeField } from "../../inspector/fields/node";
import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorVectorField } from "../../inspector/fields/vector";

import { ICinematicKeyEventData } from "../schema/event";

export class CinematicEventApplyImpulse implements ICinematicKeyEventData {
    public type: string = "apply-impulse";

    public scene: Scene;
    public force: Vector3;
    public contactPoint: Vector3;
    public radius: number = 0;
    public mesh: AbstractMesh | null;

    public constructor(scene: Scene, radius?: number, force?: Vector3, contactPoint?: Vector3, meshId?: string) {
        this.scene = scene;
        this.radius = radius ?? 0;
        this.force = force ?? Vector3.Zero();
        this.contactPoint = contactPoint ?? Vector3.Zero();
        this.mesh = meshId ? scene.getMeshById(meshId) : null;
    }

    public serialize(): any {
        return {
            type: this.type,
            radius: this.radius,
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

                {!this.mesh &&
                    <EditorInspectorNumberField object={this} property="radius" label="Radius" min={0} step={0.01} tooltip="Put 0 to ignore the radius and apply impulse on all meshes or selected mesh" />
                }

                <EditorInspectorNodeField object={this} property="mesh" scene={this.scene} label="Mesh" />
            </>
        );
    }

    public static parse(scene: Scene, config: any): CinematicEventApplyImpulse {
        return new CinematicEventApplyImpulse(
            scene,
            config.radius,
            config.force ? Vector3.FromArray(config.force) : undefined,
            config.contactPoint ? Vector3.FromArray(config.contactPoint) : undefined,
            config.mesh,
        );
    }
}
